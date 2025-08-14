class YouTubeTwitchChatReplacer {
    constructor() {
        this.currentYouTubeChannel = '';
        this.twitchChannel = '';
        this.useTwitchChat = false;
        this.twitchChatContainer = null;
        this.originalChatContainer = null;
        this.observer = null;
        this.resizeObserver = null;
        this.layoutObserver = null;
        this.channelSettings = {}; // Store settings for all channels
        
        this.init();
    }

    async init() {
        // Set up message listener for popup communication first
        this.setupMessageListener();

        // Wait for page to be ready, then detect channel and load settings
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.initializeAfterDOM());
        } else {
            this.initializeAfterDOM();
        }

        // Listen for navigation changes (YouTube is SPA)
        this.setupNavigationListener();
    }

    async initializeAfterDOM() {
        // Clear any existing Twitch chat from previous page loads
        this.clearTwitchChat();
        
        // Give YouTube a moment to load dynamic content
        setTimeout(async () => {
            await this.detectAndLoadChannel();
            this.setupChatReplacer();
        }, 1500);
    }

    async detectAndLoadChannel() {
        // Only detect channel on video/live stream pages
        if (!window.location.href.includes("/watch")) {
            console.log('yt-twitch-chat: Not on a video/live stream page, skipping channel detection');
            return;
        }

        // Try to detect channel name with retries
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            this.currentYouTubeChannel = this.extractChannelName();
            
            if (this.currentYouTubeChannel) {
                console.log(`yt-twitch-chat: Detected channel: ${this.currentYouTubeChannel}`);
                break;
            }
            
            attempts++;
            console.log(`yt-twitch-chat: Channel detection attempt ${attempts}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (!this.currentYouTubeChannel) {
            console.log('yt-twitch-chat: Could not detect YouTube channel name');
            this.currentYouTubeChannel = 'unknown';
        }
        
        // Load settings for the detected channel
        await this.loadSettings();
    }

    async loadSettings() {
        try {
            // Load all channel settings
            const result = await chrome.storage.sync.get(['channelSettings']);
            this.channelSettings = result.channelSettings || {};
            
            // Get settings for current channel
            const currentSettings = this.channelSettings[this.currentYouTubeChannel] || {};
            this.twitchChannel = currentSettings.twitchChannel || '';
            this.useTwitchChat = currentSettings.useTwitchChat || false;
            
            console.log(`yt-twitch-chat: Loaded settings for ${this.currentYouTubeChannel}:`, currentSettings);
        } catch (error) {
            console.error("yt-twitch-chat: Error loading settings:", error);
        }
    }

    async saveSettings() {
        try {
            if (!this.currentYouTubeChannel || this.currentYouTubeChannel === 'unknown') {
                console.error('yt-twitch-chat: Cannot save settings - invalid channel name:', this.currentYouTubeChannel);
                // Try to detect channel again before saving
                this.currentYouTubeChannel = this.extractChannelName();
                if (!this.currentYouTubeChannel) {
                    console.error('yt-twitch-chat: Still cannot detect channel name, using fallback');
                    this.currentYouTubeChannel = 'fallback_' + Date.now();
                }
            }
            
            // Update settings for current channel
            this.channelSettings[this.currentYouTubeChannel] = {
                twitchChannel: this.twitchChannel,
                useTwitchChat: this.useTwitchChat,
                lastUpdated: Date.now()
            };
            
            // Save all channel settings
            await chrome.storage.sync.set({ channelSettings: this.channelSettings });
            console.log(`yt-twitch-chat: Saved settings for ${this.currentYouTubeChannel}:`, {
                twitchChannel: this.twitchChannel,
                useTwitchChat: this.useTwitchChat
            });
        } catch (error) {
            console.error('yt-twitch-chat: Error saving settings:', error);
        }
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case "getChannelName":
                console.log('yt-twitch-chat: getChannelName request received');
                const channelName = this.extractChannelName();
                sendResponse({ channelName });
                break;

            case "updateSettings":
                const oldTwitchChannel = this.twitchChannel;
                this.twitchChannel = request.twitchChannel;
                this.useTwitchChat = request.useTwitchChat;
                
                // Save channel-specific settings
                this.saveSettings();

                // If channel changed or we now have a channel, recreate the chat
                if (request.twitchChannel && (oldTwitchChannel !== request.twitchChannel || !this.twitchChatContainer)) {
                    this.createTwitchChatContainer();
                }

                this.updateChatDisplay();
                sendResponse({ success: true });
                break;
        }
    }

    async onChannelChange() {
        // Give YouTube time to update the page content
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newChannel = this.extractChannelName();
        
        if (newChannel && newChannel !== this.currentYouTubeChannel && newChannel !== 'unknown') {
            console.log(`yt-twitch-chat: Channel changed from ${this.currentYouTubeChannel} to ${newChannel}`);
            this.currentYouTubeChannel = newChannel;
            
            // Load settings for new channel
            await this.loadSettings();
            
            // Check if this channel has saved settings
            if (this.twitchChannel) {
                // Channel has saved settings, apply them
                this.createTwitchChatContainer();
                this.updateChatDisplay();
            } else {
                // New channel, prompt for association
                this.promptForChannelAssociation();
            }
        }
    }

    promptForChannelAssociation() {
        // Only prompt if we're on a live stream page with chat
        const chatFrame = document.querySelector('ytd-live-chat-frame#chat');
        if (!chatFrame) {
            return;
        }

        // Show prompt after a short delay to let YouTube finish loading
        setTimeout(() => {
            this.showChannelPrompt(true); // true = new channel prompt
        }, 2000);
    }

    extractChannelName() {
        // Only extract channel names on video/live stream pages
        if (!window.location.href.includes("/watch")) {
            return "";
        }

        // Try multiple methods to get channel name
        let channelName = "";

        // Method 1: From div#owner > a tag with @link (most reliable)
        const ownerDiv = document.querySelector('#owner');
        if (ownerDiv) {
            const ownerLink = ownerDiv.querySelector('a[href*="/@"]');
            if (ownerLink) {
                const href = ownerLink.href;
                const match = href.match(/youtube\.com\/@([^\/\?]+)/);
                if (match) {
                    channelName = match[1];
                    console.log(`yt-twitch-chat: Found channel from #owner div: ${channelName}`);
                }
            }
        }

        // Method 2: From other video page channel links (fallback)
        if (!channelName) {
            const channelSelectors = [
                '#owner-name a[href*="/@"]',
                '.ytd-channel-name a[href*="/@"]', 
                '.ytd-video-owner-renderer a[href*="/@"]',
                'ytd-channel-name a[href*="/@"]',
                '#upload-info ytd-channel-name a'
            ];
            
            for (const selector of channelSelectors) {
                const channelLink = document.querySelector(selector);
                if (channelLink) {
                    const href = channelLink.href;
                    const match = href.match(/youtube\.com\/@([^\/\?]+)/);
                    if (match) {
                        channelName = match[1];
                        break;
                    }
                }
            }
        }

        // Method 3: From channel name text elements (only from video page context)
        if (!channelName) {
            const textSelectors = [
                '#owner a',
                '#owner-name a',
                '.ytd-channel-name a',
                '.ytd-video-owner-renderer .ytd-channel-name',
                '#owner a',
                '#owner-name a',
                '.ytd-channel-name a',
                '.ytd-video-owner-renderer .ytd-channel-name',
                'ytd-channel-name a',
                '#upload-info ytd-channel-name a'
            ];
            
            for (const selector of textSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    channelName = element.textContent.trim();
                    break;
                }
            }
        }

        // Method 4: From video metadata or other video-specific sources
        if (!channelName) {
            const metaSelectors = [
                '[itemprop="author"] [itemprop="name"]',
                '.ytd-video-primary-info-renderer .ytd-channel-name'
            ];
            
            for (const selector of metaSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    channelName = element.textContent.trim();
                    break;
                }
            }
        }

        // Clean up the channel name
        if (channelName) {
            channelName = channelName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
        }

        return channelName;
    }

    clearTwitchChat() {
        // Immediately remove any existing Twitch chat iframe
        const existingTwitchIframe = document.querySelector("#twitch-chat-iframe");
        if (existingTwitchIframe) {
            existingTwitchIframe.remove();
            console.log('yt-twitch-chat: Cleared Twitch chat iframe during navigation');
        }
        
        // Remove any channel prompts
        const existingPrompt = document.querySelector("#twitch-channel-prompt");
        if (existingPrompt) {
            existingPrompt.remove();
            console.log('yt-twitch-chat: Cleared channel prompt during navigation');
        }
        
        // Show YouTube chat if it was hidden
        const youtubeIframe = document.querySelector("#chatframe");
        if (youtubeIframe) {
            youtubeIframe.style.display = "block";
        }
        
        // Reset the original chat container display
        if (this.originalChatContainer) {
            this.originalChatContainer.style.display = "block";
        }
        
        // Clear the twitch chat container reference
        this.twitchChatContainer = null;
    }

    detectAndHandleDisabledChat() {
        // Check if chat is disabled by looking for the disabled message
        const chatDisabledMessage = document.querySelector('ytd-message-renderer yt-formatted-string[id="message"]');
        const isChatDisabled = chatDisabledMessage && 
            chatDisabledMessage.textContent.includes('Chat is disabled for this live stream');
        
        // Also check if chat frame is collapsed
        const chatFrame = document.querySelector('ytd-live-chat-frame#chat');
        const isChatCollapsed = chatFrame && chatFrame.hasAttribute('collapsed');
        
        if (isChatDisabled || isChatCollapsed) {
            console.log('yt-twitch-chat: Detected disabled/collapsed YouTube chat');
            
            // If chat is collapsed, expand it first
            if (isChatCollapsed) {
                console.log('yt-twitch-chat: Chat is collapsed, attempting to expand');
                
                // Remove the collapsed attribute
                chatFrame.removeAttribute('collapsed');
                
                // Try to find and click show/hide button
                const showHideButtonSelectors = [
                    '#show-hide-button ytd-toggle-button-renderer yt-button-shape button',
                    '#show-hide-button button',
                    'ytd-live-chat-frame #show-hide-button button',
                    '.ytd-live-chat-frame [role="button"]',
                    '#show-hide-button [role="button"]'
                ];
                
                let buttonClicked = false;
                for (const selector of showHideButtonSelectors) {
                    const button = document.querySelector(selector);
                    if (button) {
                        console.log('yt-twitch-chat: Clicking show chat button with selector:', selector);
                        button.click();
                        buttonClicked = true;
                        break;
                    }
                }
                
                if (!buttonClicked) {
                    console.log('yt-twitch-chat: Could not find show/hide chat button');
                }
            }
            
            // Remove the disabled chat message element if it exists
            if (isChatDisabled) {
                const messageRenderer = document.querySelector('ytd-live-chat-frame ytd-message-renderer');
                if (messageRenderer) {
                    console.log('yt-twitch-chat: Removing disabled chat message');
                    messageRenderer.remove();
                }
            }
            
            // If we have a saved Twitch channel for this YouTube channel, enable it automatically
            if (this.twitchChannel) {
                console.log('yt-twitch-chat: Auto-enabling Twitch chat due to disabled/collapsed YouTube chat');
                this.useTwitchChat = true;
                this.saveSettings();
                
                // Create Twitch chat after a small delay to let UI update
                setTimeout(() => {
                    this.createTwitchChatContainer();
                    this.updateChatDisplay();
                }, 500);
            } else {
                // No saved Twitch channel, prompt user
                setTimeout(() => {
                    this.promptForChannelAssociation();
                }, 500);
            }
            
            return true; // Chat was disabled and handled
        }
        
        return false; // Chat is not disabled
    }

    setupChatStateObserver() {
        // Watch for changes to chat state (disabled messages appearing, collapsed attribute changes)
        if (this.chatStateObserver) {
            this.chatStateObserver.disconnect();
        }
        
        const chatFrame = document.querySelector('ytd-live-chat-frame#chat');
        if (chatFrame) {
            this.chatStateObserver = new MutationObserver((mutations) => {
                let shouldCheckDisabled = false;
                
                mutations.forEach((mutation) => {
                    // Check for attribute changes (collapsed state)
                    if (mutation.type === 'attributes' && mutation.attributeName === 'collapsed') {
                        shouldCheckDisabled = true;
                    }
                    
                    // Check for new nodes (disabled message being added)
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.tagName === 'YTD-MESSAGE-RENDERER') {
                                shouldCheckDisabled = true;
                                break;
                            }
                        }
                    }
                });
                
                if (shouldCheckDisabled) {
                    console.log('yt-twitch-chat: Chat state changed, checking if disabled/collapsed');
                    setTimeout(() => {
                        this.detectAndHandleDisabledChat();
                    }, 100);
                }
            });
            
            // Observe both attribute changes and child list changes
            this.chatStateObserver.observe(chatFrame, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['collapsed']
            });
            
            console.log('yt-twitch-chat: Set up chat state observer');
        }
    }

    setupNavigationListener() {
        // YouTube uses pushstate navigation, so we need to listen for URL changes
        let currentUrl = window.location.href;

        const checkForUrlChange = () => {
            if (currentUrl !== window.location.href) {
                const newUrl = window.location.href;
                
                // Immediately clear any existing Twitch chat to prevent lag
                this.clearTwitchChat();
                
                // Check if we're leaving a video/live stream page entirely
                const wasOnVideoPage = currentUrl.includes('/watch?') || currentUrl.includes('/live/');
                const isOnVideoPage = newUrl.includes('/watch?') || newUrl.includes('/live/');
                
                if (wasOnVideoPage && !isOnVideoPage) {
                    console.log('yt-twitch-chat: Left video page, chat cleared');
                    // Reset state when leaving video pages
                    this.currentYouTubeChannel = '';
                    this.twitchChannel = '';
                    this.useTwitchChat = false;
                }
                
                currentUrl = newUrl;
                
                // Only set up chat replacer if we're on a video page
                if (isOnVideoPage) {
                    // Delay to let YouTube load the new page content
                    setTimeout(() => {
                        this.onChannelChange(); // Check for channel change first
                        this.setupChatReplacer();
                    }, 2000);
                }
            }
        };

        // Listen for navigation events
        window.addEventListener("popstate", checkForUrlChange);

        // Also observe DOM changes for YouTube's SPA navigation
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver(() => {
            checkForUrlChange();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    setupChatReplacer() {
        // Only run on YouTube watch pages
        if (!window.location.href.includes("/watch")) {
            return;
        }

        // Wait for chat container to be available
        this.waitForChatContainer().then(() => {
            // Set up observer to watch for chat state changes
            this.setupChatStateObserver();
            
            // Check if chat is disabled first
            const chatWasDisabled = this.detectAndHandleDisabledChat();
            
            // If chat wasn't disabled, proceed with normal logic
            if (!chatWasDisabled) {
                if (!this.twitchChannel) {
                    this.showChannelPrompt();
                } else {
                    this.createTwitchChatContainer();
                    this.updateChatDisplay();
                }
            }
        });
    }

    waitForChatContainer(maxAttempts = 30) {
        return new Promise((resolve) => {
            let attempts = 0;
            const checkForChat = () => {
                const chatContainer = document.querySelector("#chat-container, ytd-live-chat-frame");
                if (chatContainer || attempts >= maxAttempts) {
                    this.originalChatContainer = chatContainer;
                    resolve(chatContainer);
                } else {
                    attempts++;
                    setTimeout(checkForChat, 500);
                }
            };
            checkForChat();
        });
    }

    showChannelPrompt(isNewChannel = false) {
        if (!this.originalChatContainer) {
            return;
        }

        // Remove existing prompt if present
        const existingPrompt = document.querySelector("#twitch-channel-prompt");
        if (existingPrompt) {
            existingPrompt.remove();
        }

        // Create channel prompt overlay that matches chat container dimensions
        const promptContainer = document.createElement("div");
        promptContainer.id = "twitch-channel-prompt";

        // Copy styles from chat container to match exactly, including video player height in default mode
        const computedStyle = window.getComputedStyle(this.originalChatContainer);
        const isTheaterMode = document.querySelector(".ytd-watch-flexy[theater]") !== null;

        let heightValue = computedStyle.height;

        // For default mode, match the video player height
        if (!isTheaterMode) {
            const videoElement = document.querySelector("#movie_player, .html5-video-player, video");
            if (videoElement) {
                const videoRect = videoElement.getBoundingClientRect();
                heightValue = `${videoRect.height}px`;
            }
        }

        promptContainer.style.cssText = `
            width: ${computedStyle.width};
            height: ${heightValue};
            position: ${computedStyle.position === "static" ? "relative" : computedStyle.position};
            background: var(--yt-spec-base-background, #fff);
            border: ${computedStyle.border};
            border-radius: ${computedStyle.borderRadius};
            margin: ${computedStyle.margin};
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            min-height: ${heightValue};
            max-height: ${heightValue};
        `;

        // Auto-detect channel name
        const suggestedChannel = this.extractChannelName();
        
        // Different content for new channel vs settings change
        const title = 'Connect Twitch Chat';
        const description = 'Would you like to associate a Twitch chat with this YouTube channel?'
        promptContainer.innerHTML = `
            <div style="text-align: center; max-width: 300px;">
                <div style="margin-bottom: 16px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="color: #9146ff; margin-bottom: 12px;">
                        <path d="M2.149 0L.537 4.119v15.581h5.4V24l4.119-4.3h3.23L21.463 12V0H2.149zM19.541 11.16l-2.42 2.42H13.9l-2.148 2.148v-2.148H7.582V1.922h11.959V11.16z"/>
                        <path d="M15.789 5.559h-1.93v5.4h1.93V5.559zM11.67 5.559H9.74v5.4h1.93V5.559z"/>
                    </svg>
                    <h3 style="margin: 0 0 8px 0; color: var(--yt-spec-text-primary); font-size: 16px; font-weight: 500;">${title}</h3>
                    <p style="margin: 0 0 16px 0; color: var(--yt-spec-text-secondary); font-size: 13px; line-height: 1.4;">
                        ${description}
                    </p>
                </div>
                
                <div style="width: 100%; margin-bottom: 16px;">
                    <input type="text" id="twitch-channel-input" placeholder="Enter Twitch channel name" 
                           value="${suggestedChannel.toLowerCase().replace(/\s+/g, "")}"
                           style="width: 100%; padding: 10px; border: 1px solid var(--yt-spec-10-percent-layer); 
                                  border-radius: 4px; font-size: 14px; background: var(--yt-spec-base-background);
                                  color: var(--yt-spec-text-primary); box-sizing: border-box;">
                </div>
                
                <div style="display: flex; gap: 8px; width: 100%;">
                    <button id="cancel-twitch-setup" style="flex: 1; padding: 10px; border: 1px solid var(--yt-spec-10-percent-layer);
                            background: transparent; color: var(--yt-spec-text-primary); border-radius: 4px; cursor: pointer; font-size: 13px;">
                        ${'Keep YouTube Chat'}
                    </button>
                    <button id="confirm-twitch-setup" style="flex: 1; padding: 10px; border: none; background: #9146ff;
                            color: white; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;">
                        Connect Twitch
                    </button>
                </div>
                
                ${
                    suggestedChannel
                        ? `<p style="margin: 12px 0 0 0; color: var(--yt-spec-text-secondary); font-size: 11px;">
                    Auto-detected from: ${suggestedChannel}
                </p>`
                        : ""
                }
            </div>
        `;

        // Position the prompt as a sibling to chat container
        this.originalChatContainer.parentNode.insertBefore(promptContainer, this.originalChatContainer.nextSibling);

        // Hide the original chat while showing prompt
        this.originalChatContainer.style.display = "none";

        // Handle button clicks
        const channelInput = promptContainer.querySelector("#twitch-channel-input");
        const cancelBtn = promptContainer.querySelector("#cancel-twitch-setup");
        const confirmBtn = promptContainer.querySelector("#confirm-twitch-setup");

        // Focus input and select text if pre-filled
        channelInput.focus();
        if (channelInput.value) {
            channelInput.select();
        }

        // Enter key submits
        channelInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                confirmBtn.click();
            }
        });

        cancelBtn.addEventListener("click", () => {
            promptContainer.remove();
            this.originalChatContainer.style.display = "block";
            
            // For new channels, save the preference to use YouTube chat
            if (isNewChannel) {
                this.useTwitchChat = false;
                this.twitchChannel = ''; // No associated Twitch channel
                this.saveSettings();
            }
        });

        confirmBtn.addEventListener("click", () => {
            const channelName = channelInput.value.trim().toLowerCase();
            if (channelName) {
                // Make sure we have the current YouTube channel detected
                const detectedChannel = this.extractChannelName();
                if (detectedChannel && detectedChannel !== this.currentYouTubeChannel) {
                    console.log(`yt-twitch-chat: Updating YouTube channel from ${this.currentYouTubeChannel} to ${detectedChannel}`);
                    this.currentYouTubeChannel = detectedChannel;
                }
                
                console.log(`yt-twitch-chat: Setting up association: ${this.currentYouTubeChannel} -> ${channelName}`);
                
                this.twitchChannel = channelName;
                this.useTwitchChat = true;

                // Save channel-specific settings
                this.saveSettings();

                // Remove prompt and setup chat
                promptContainer.remove();
                this.originalChatContainer.style.display = "block";
                this.createTwitchChatContainer();
                this.updateChatDisplay();
            } else {
                channelInput.style.borderColor = "#ff4444";
                channelInput.focus();
            }
        });
    }

    createTwitchChatContainer() {
        // Remove existing Twitch chat if present
        const existingTwitchIframe = document.querySelector("#twitch-chat-iframe");
        if (existingTwitchIframe) {
            existingTwitchIframe.remove();
        }

        if (!this.originalChatContainer || !this.twitchChannel) {
            return;
        }

        // Find the chat frame container (ytd-live-chat-frame with id="chat")
        const chatFrame = document.querySelector("ytd-live-chat-frame#chat");
        if (!chatFrame) {
            console.log("yt-twitch-chat: Could not find ytd-live-chat-frame#chat element, page is not a live stream");
            return;
        }

        const youtubeIframe = document.querySelector("#chatframe");
        const twitchIframe = document.createElement("iframe");
        twitchIframe.id = "twitch-chat-iframe";
        if (!youtubeIframe) {
            console.error("yt-twitch-chat: Could not find YouTube chat iframe");
            return;
        }
        twitchIframe.style.cssText += youtubeIframe.style.cssText;
        twitchIframe.classList.add(...youtubeIframe.classList);
        const isDarkMode = this.detectDarkMode();
        twitchIframe.src = `https://www.twitch.tv/embed/${this.twitchChannel}/chat?parent=${window.location.hostname}${
            isDarkMode ? "&darkpopout" : ""
        }`;

        // Insert Twitch iframe into the chat frame
        chatFrame.appendChild(twitchIframe);

        // Store reference to the Twitch iframe
        this.twitchChatContainer = twitchIframe;

        // Add resize observer to maintain dimensions
        this.setupResizeObserver();
    }

    setupResizeObserver() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Observe changes to both chat container and video player
        this.resizeObserver = new ResizeObserver((entries) => {
            this.updateTwitchChatDimensions();
        });

        // Observe the original chat container
        if (this.originalChatContainer) {
            this.resizeObserver.observe(this.originalChatContainer);
        }

        // Also observe the video player for height changes in default mode
        const videoElement = document.querySelector("#movie_player, .html5-video-player");
        if (videoElement) {
            this.resizeObserver.observe(videoElement);
        }

        // Set up a mutation observer to catch theater mode changes
        if (this.layoutObserver) {
            this.layoutObserver.disconnect();
        }

        this.layoutObserver = new MutationObserver(() => {
            // Small delay to let YouTube finish layout changes
            setTimeout(() => this.updateTwitchChatDimensions(), 100);
        });

        // Observe the main YouTube flexy container for layout changes
        const flexyContainer = document.querySelector(".ytd-watch-flexy");
        if (flexyContainer) {
            this.layoutObserver.observe(flexyContainer, {
                attributes: true,
                attributeFilter: ["theater", "fullscreen"],
            });
        }
    }

    updateTwitchChatDimensions() {
        const twitchIframe = document.querySelector("#twitch-chat-iframe");
        if (!twitchIframe) {
            return;
        }

        // The iframe will automatically size to fit the ytd-live-chat-frame container
        // No manual dimension updates needed since it's positioned absolutely within the frame
    }

    setupMessageListener() {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case "toggleChat":
                    this.useTwitchChat = !this.useTwitchChat;
                    this.saveSettings(); // Use channel-specific save
                    this.updateChatDisplay();
                    sendResponse({ success: true, useTwitchChat: this.useTwitchChat });
                    break;
                case "getState":
                    sendResponse({
                        useTwitchChat: this.useTwitchChat,
                        twitchChannel: this.twitchChannel,
                        currentYouTubeChannel: this.currentYouTubeChannel,
                        isActive: !!document.querySelector("#twitch-chat-iframe"),
                        hasSettings: !!this.channelSettings[this.currentYouTubeChannel]
                    });
                    break;
                case "changeChannel":
                    this.showChannelPrompt();
                    sendResponse({ success: true });
                    break;
            }
        });
    }

    updateChatDisplay() {
        const youtubeIframe = document.querySelector("#chatframe");
        const twitchIframe = document.querySelector("#twitch-chat-iframe");

        if (this.useTwitchChat && this.twitchChannel && twitchIframe) {
            // Show Twitch chat, hide YouTube chat
            if (youtubeIframe) {
                youtubeIframe.style.display = "none";
            }
            twitchIframe.style.display = "block";
        } else {
            // Show YouTube chat, hide Twitch chat
            if (youtubeIframe) {
                youtubeIframe.style.display = "block";
            }
            if (twitchIframe) {
                twitchIframe.style.display = "none";
            }
        }
    }

    updateToggleButton(button) {
        const currentChat = this.useTwitchChat ? "Twitch" : "YouTube";
        const nextChat = this.useTwitchChat ? "YouTube" : "Twitch";

        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                ${
                    this.useTwitchChat
                        ? `
                    <path d="M2.149 0L.537 4.119v15.581h5.4V24l4.119-4.3h3.23L21.463 12V0H2.149zM19.541 11.16l-2.42 2.42H13.9l-2.148 2.148v-2.148H7.582V1.922h11.959V11.16z"/>
                    <path d="M15.789 5.559h-1.93v5.4h1.93V5.559zM11.67 5.559H9.74v5.4h1.93V5.559z"/>
                `
                        : `
                    <path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4.052,12,4.052,12,4.052s-6.254,0-7.814,0.366c-0.86,0.23-1.538,0.908-1.768,1.768C2.052,7.746,2.052,12,2.052,12s0,4.254,0.366,5.814c0.23,0.86,0.908,1.538,1.768,1.768C5.746,19.948,12,19.948,12,19.948s6.254,0,7.814-0.366c0.86-0.23,1.538-0.908,1.768-1.768C21.948,16.254,21.948,12,21.948,12S21.948,7.746,21.582,6.186z M9.695,15.208V8.792L15.208,12L9.695,15.208z"/>
                `
                }
            </svg>
            <span style="margin-left: 4px;">${currentChat}</span>
        `;

        button.title = `Switch to ${nextChat} chat`;
        button.style.cssText = `
            background: ${this.useTwitchChat ? "#9146ff" : "#ff0000"};
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 10px;
            cursor: pointer;
            display: flex;
            align-items: center;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
            font-family: "Roboto", "Arial", sans-serif;
        `;

        // Hover effects
        button.addEventListener("mouseover", () => {
            button.style.transform = "scale(1.05)";
            button.style.opacity = "0.9";
        });

        button.addEventListener("mouseout", () => {
            button.style.transform = "scale(1)";
            button.style.opacity = "1";
        });
    }

    createToggleButton() {
        // Remove existing toggle if present
        const existingToggle = document.querySelector("#chat-toggle-btn");
        if (existingToggle) {
            existingToggle.remove();
        }

        const toggleButton = document.createElement("button");
        toggleButton.id = "chat-toggle-btn";
        toggleButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2h12v8H6l-2 2v-2H2V2zm1 1v6h2v1l1-1h7V3H3z"/>
                <path d="M5 5h1v1H5V5zm2 0h1v1H7V5zm2 0h1v1H9V5z"/>
            </svg>
            <span>${this.useTwitchChat ? "Twitch" : "YouTube"}</span>
        `;

        toggleButton.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 1000;
            background: var(--yt-spec-badge-chip-background, rgba(0,0,0,0.8));
            color: var(--yt-spec-text-primary, white);
            border: none;
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;
        `;

        toggleButton.addEventListener("mouseover", () => {
            toggleButton.style.background = "var(--yt-spec-brand-button-text, #9146ff)";
        });

        toggleButton.addEventListener("mouseout", () => {
            toggleButton.style.background = "var(--yt-spec-badge-chip-background, rgba(0,0,0,0.8))";
        });

        toggleButton.addEventListener("click", () => {
            this.useTwitchChat = !this.useTwitchChat;
            chrome.storage.sync.set({ useTwitchChat: this.useTwitchChat });
            this.updateChatDisplay();
            toggleButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 2h12v8H6l-2 2v-2H2V2zm1 1v6h2v1l1-1h7V3H3z"/>
                    <path d="M5 5h1v1H5V5zm2 0h1v1H7V5zm2 0h1v1H9V5z"/>
                </svg>
                <span>${this.useTwitchChat ? "Twitch" : "YouTube"}</span>
            `;
        });

        // Find a good place to insert the toggle button
        const chatHeader = document.querySelector("#chat-container .ytd-live-chat-frame, #chat");
        if (chatHeader && this.originalChatContainer) {
            this.originalChatContainer.style.position = "relative";
            this.originalChatContainer.appendChild(toggleButton);
        }
    }

    updateChatDisplay() {
        const youtubeIframe = document.querySelector("#chatframe");
        const twitchIframe = document.querySelector("#twitch-chat-iframe");

        if (this.useTwitchChat && this.twitchChannel && twitchIframe) {
            // Show Twitch chat, hide YouTube chat
            if (youtubeIframe) {
                youtubeIframe.style.display = "none";
            }
            twitchIframe.style.display = "block";
        } else {
            // Show YouTube chat, hide Twitch chat
            if (youtubeIframe) {
                youtubeIframe.style.display = "block";
            }
            if (twitchIframe) {
                twitchIframe.style.display = "none";
            }
        }

        // Update toggle button if it exists
        const toggleBtn = document.querySelector("#chat-toggle-btn");
        if (toggleBtn) {
            this.updateToggleButton(toggleBtn);
        }
    }

    detectDarkMode() {
        // Check YouTube's dark mode
        const html = document.documentElement;
        const isDarkMode =
            html.hasAttribute("dark") ||
            html.classList.contains("dark") ||
            document.body.classList.contains("dark") ||
            window.matchMedia("(prefers-color-scheme: dark)").matches;

        return isDarkMode;
    }
}

// Initialize the chat replacer
const chatReplacer = new YouTubeTwitchChatReplacer();
