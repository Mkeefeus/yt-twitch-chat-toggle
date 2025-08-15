// Types for the extension
interface ChannelSettings {
  twitchChannel: string;
  preferredChat: 'youtube' | 'twitch';
  lastUpdated: number;
  created: number;
}

interface ExtensionSettings {
  version: number;
  channels: Record<string, ChannelSettings>;
  lastUpdated: number;
  useSync?: boolean; // New setting for storage preference
}

interface MessageRequest {
  action: 'toggleChat' | 'getState' | 'settingsUpdated' | 'setStorageType';
  preferredChat?: 'youtube' | 'twitch';
  twitchChannel?: string;
  useSync?: boolean;
}

interface StateResponse extends Record<string, unknown> {
  useTwitchChat: boolean;
  twitchChannel: string;
  currentYouTubeChannel: string;
  isActive: boolean;
  useSync?: boolean;
}

class YouTubeTwitchChatReplacer {
  private currentYouTubeChannel: string = '';
  private twitchChannel: string = '';
  private useTwitchChat: boolean = false;
  private originalChatContainer: Element | null = null;
  private observer: MutationObserver | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // Set up message listener for popup communication first
    this.setupMessageListener();

    // Wait for page to be ready, then detect channel and load settings
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeAfterDOM());
    } else {
      this.initializeAfterDOM();
    }

    // Listen for navigation changes (YouTube is SPA)
    this.setupNavigationListener();
  }

  private async initializeAfterDOM(): Promise<void> {
    // Clear any existing Twitch chat from previous page loads
    this.clearTwitchChat();

    // Give YouTube a moment to load dynamic content
    setTimeout(async () => {
      await this.detectAndLoadChannel();
      this.setupChatReplacer();
    }, 1500);
  }

  private async detectAndLoadChannel(): Promise<void> {
    // Only detect channel on video/live stream pages
    if (!window.location.href.includes('/watch')) {
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

  private async loadSettings(): Promise<void> {
    try {
      if (!this.currentYouTubeChannel || this.currentYouTubeChannel === 'unknown') {
        console.log('yt-twitch-chat: Skipping settings load - invalid channel name:', this.currentYouTubeChannel);
        return;
      }

      // Load from appropriate storage (local or sync based on user preference)
      const storage = await this.getStorageApi();
      const result = await storage.get(['yt_twitch_settings']);
      const allSettings: ExtensionSettings = result.yt_twitch_settings || {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        useSync: false // Default to local storage
      };

      // Get settings for current channel
      const channelSettings = allSettings.channels[this.currentYouTubeChannel];

      if (channelSettings) {
        this.twitchChannel = channelSettings.twitchChannel || '';
        this.useTwitchChat = channelSettings.preferredChat === 'twitch';
        console.log(`yt-twitch-chat: Loaded settings for ${this.currentYouTubeChannel}:`, channelSettings);
      } else {
        // No settings found for this channel
        this.twitchChannel = '';
        this.useTwitchChat = false;
        console.log(`yt-twitch-chat: No settings found for ${this.currentYouTubeChannel} - will show prompt`);
      }

    } catch (error) {
      console.error('yt-twitch-chat: Error loading settings:', error);
    }
  }

  private async saveChannelSpecificSettings(twitchChannel?: string, useTwitchChat?: boolean): Promise<void> {
    try {
      if (!this.currentYouTubeChannel || this.currentYouTubeChannel === 'unknown') {
        console.error('yt-twitch-chat: Cannot save settings - invalid channel name:', this.currentYouTubeChannel);
        return;
      }

      // Use provided values or current instance values
      const channelToSave = twitchChannel !== undefined ? twitchChannel : this.twitchChannel;
      const chatPreference = useTwitchChat !== undefined ? useTwitchChat : this.useTwitchChat;

      // Load existing settings structure from appropriate storage
      const storage = await this.getStorageApi();
      const result = await storage.get(['yt_twitch_settings']);
      const allSettings: ExtensionSettings = result.yt_twitch_settings || {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        useSync: await this.getStorageType()
      };

      // Update settings for this channel
      allSettings.channels[this.currentYouTubeChannel] = {
        twitchChannel: channelToSave,
        preferredChat: chatPreference ? 'twitch' : 'youtube',
        lastUpdated: Date.now(),
        created: allSettings.channels[this.currentYouTubeChannel]?.created || Date.now()
      };

      // Update global timestamp
      allSettings.lastUpdated = Date.now();

      // Validate settings before saving
      if (!this.validateSettings(allSettings)) {
        throw new Error('Settings validation failed');
      }

      // Save back to appropriate storage
      await storage.set({ yt_twitch_settings: allSettings });

      console.log(`yt-twitch-chat: Saved settings for ${this.currentYouTubeChannel}:`, allSettings.channels[this.currentYouTubeChannel]);
    } catch (error) {
      console.error('yt-twitch-chat: Error saving channel-specific settings:', error);
    }
  }

  private async handleSettingsUpdated(): Promise<void> {
    console.log('yt-twitch-chat: Settings updated from popup, refreshing...');

    // Clear any active prompt
    this.clearPrompt();

    // Reload settings from storage
    await this.loadSettings();

    // Update the chat display based on new settings
    this.updateChatDisplay();
  }

  private clearPrompt(): void {
    const promptContainer = document.querySelector('#twitch-channel-prompt');
    if (promptContainer) {
      promptContainer.remove();
      console.log('yt-twitch-chat: Cleared active prompt');
    }
  }

  private async getStorageType(): Promise<boolean> {
    // Check both storages for useSync preference, defaulting to false (local storage)
    try {
      const localResult = await chrome.storage.local.get(['yt_twitch_settings']);
      if (localResult.yt_twitch_settings?.useSync !== undefined) {
        return localResult.yt_twitch_settings.useSync;
      }

      const syncResult = await chrome.storage.sync.get(['yt_twitch_settings']);
      return syncResult.yt_twitch_settings?.useSync || false;
    } catch (error) {
      console.error('yt-twitch-chat: Error getting storage type:', error);
      return false; // Default to local storage
    }
  }

  private async getStorageApi(): Promise<chrome.storage.StorageArea> {
    const useSync = await this.getStorageType();
    return useSync ? chrome.storage.sync : chrome.storage.local;
  }

  private async setStorageType(useSync: boolean): Promise<void> {
    try {
      console.log(`yt-twitch-chat: Switching storage type to ${useSync ? 'sync' : 'local'}`);

      // Get current settings from both storages
      const [localResult, syncResult] = await Promise.all([
        chrome.storage.local.get(['yt_twitch_settings']),
        chrome.storage.sync.get(['yt_twitch_settings'])
      ]);

      let settingsToUse: ExtensionSettings;

      if (useSync) {
        // Switching to sync storage
        if (localResult.yt_twitch_settings && Object.keys(localResult.yt_twitch_settings.channels || {}).length > 0) {
          // Copy local data to sync
          console.log('yt-twitch-chat: Copying local settings to sync storage');
          settingsToUse = localResult.yt_twitch_settings;
          settingsToUse.useSync = true;
          settingsToUse.lastUpdated = Date.now();

          await chrome.storage.sync.set({ yt_twitch_settings: settingsToUse });
          await chrome.storage.local.clear(); // Clear local storage
        } else {
          // Just enable sync on existing sync data or create new
          settingsToUse = syncResult.yt_twitch_settings || { version: 1, channels: {}, lastUpdated: Date.now() };
          settingsToUse.useSync = true;
          await chrome.storage.sync.set({ yt_twitch_settings: settingsToUse });
        }
      } else {
        // Switching to local storage
        if (syncResult.yt_twitch_settings && Object.keys(syncResult.yt_twitch_settings.channels || {}).length > 0) {
          // Copy sync data to local
          console.log('yt-twitch-chat: Copying sync settings to local storage');
          settingsToUse = syncResult.yt_twitch_settings;
          settingsToUse.useSync = false;
          settingsToUse.lastUpdated = Date.now();

          await chrome.storage.local.set({ yt_twitch_settings: settingsToUse });
          await chrome.storage.sync.clear(); // Clear sync storage
        } else {
          // Just disable sync on existing local data or create new
          settingsToUse = localResult.yt_twitch_settings || { version: 1, channels: {}, lastUpdated: Date.now() };
          settingsToUse.useSync = false;
          await chrome.storage.local.set({ yt_twitch_settings: settingsToUse });
        }
      }

      console.log('yt-twitch-chat: Storage type changed successfully');
    } catch (error) {
      console.error('yt-twitch-chat: Error setting storage type:', error);
    }
  }

  private validateSettings(settings: ExtensionSettings): boolean {
    // Basic validation
    if (!settings || typeof settings !== 'object') {return false;}
    if (!settings.version || !settings.channels) {return false;}

    // Validate each channel's settings
    for (const [_channel, data] of Object.entries(settings.channels)) {
      if (!data || typeof data !== 'object') {return false;}
      if (!Object.prototype.hasOwnProperty.call(data, 'twitchChannel') || !Object.prototype.hasOwnProperty.call(data, 'preferredChat')) {return false;}
      if (!['youtube', 'twitch'].includes(data.preferredChat)) {return false;}
    }

    return true;
  }

  private setupMessageListener(): void {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message: MessageRequest, sender: chrome.runtime.MessageSender, sendResponse: (response?: Record<string, unknown>) => void) => {
      // Handle async operations
      (async () => {
        switch (message.action) {
        case 'toggleChat':
          // Update chat preference from popup
          this.useTwitchChat = message.preferredChat === 'twitch';
          this.twitchChannel = message.twitchChannel || this.twitchChannel;

          // Create Twitch chat container if switching to Twitch and don't have one
          if (this.useTwitchChat && this.twitchChannel && !document.querySelector('#twitch-chat-iframe')) {
            this.createTwitchChatContainer();
          }

          // Update the display immediately
          this.updateChatDisplay();

          // Save the new settings
          await this.saveChannelSpecificSettings();

          sendResponse({ success: true, useTwitchChat: this.useTwitchChat });
          break;
        case 'getState': {
          const useSync = await this.getStorageType();
          const response: StateResponse = {
            useTwitchChat: this.useTwitchChat,
            twitchChannel: this.twitchChannel,
            currentYouTubeChannel: this.currentYouTubeChannel,
            isActive: !!document.querySelector('#twitch-chat-iframe'),
            useSync: useSync
          };
          sendResponse(response);
          break;
        }
        case 'settingsUpdated':
          await this.handleSettingsUpdated();
          sendResponse({ success: true });
          break;
        case 'setStorageType':
          if (message.useSync !== undefined) {
            await this.setStorageType(message.useSync);
            await this.loadSettings(); // Reload settings from new storage location
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'useSync parameter required' });
          }
          break;
        }
      })();

      return true; // Keep the message channel open for async response
    });
  }

  private extractChannelName(): string {
    // Only extract channel names on video/live stream pages
    if (!window.location.href.includes('/watch')) {
      return '';
    }

    // Try multiple methods to get channel name
    let channelName = '';

    // Method 1: From div#owner > a tag with @link (most reliable)
    const ownerDiv = document.querySelector('#owner');
    if (ownerDiv) {
      const ownerLink = ownerDiv.querySelector('a[href*="/@"]') as HTMLAnchorElement;
      if (ownerLink) {
        const href = ownerLink.href;
        const match = href.match(/\/@([^/?]+)/);
        if (match) {
          channelName = match[1];
          console.log('yt-twitch-chat: Found channel via owner div @link:', channelName);
        }
      }
    }

    // Clean up the channel name
    if (channelName) {
      // Remove any URL encoding and clean up
      channelName = decodeURIComponent(channelName);
      // Remove any trailing parameters or fragments
      channelName = channelName.split('?')[0].split('#')[0];
      console.log('yt-twitch-chat: Final cleaned channel name:', channelName);
    }

    return channelName;
  }

  private clearTwitchChat(): void {
    // Remove any existing Twitch chat iframe
    const existingTwitchIframe = document.querySelector('#twitch-chat-iframe');
    existingTwitchIframe?.remove();

    // Show YouTube chat if it was hidden
    const youtubeIframe = document.querySelector('#chatframe') as HTMLElement;
    if (youtubeIframe) {
      youtubeIframe.style.display = 'block';
    }

    // Reset the original chat container display
    if (this.originalChatContainer) {
      (this.originalChatContainer as HTMLElement).style.display = 'block';
    }
  }

  private setupNavigationListener(): void {
    // YouTube uses pushstate navigation, so we need to listen for URL changes
    let currentUrl = window.location.href;

    const checkForUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('yt-twitch-chat: Navigation detected, reinitializing...');
        setTimeout(() => this.initializeAfterDOM(), 500);
        // Also trigger channel change detection
        setTimeout(() => this.onChannelChange(), 1000);
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', checkForUrlChange);

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

  private async onChannelChange(): Promise<void> {
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

  private promptForChannelAssociation(): void {
    // Only prompt if we're on a live stream page with chat
    const chatFrame = document.querySelector('ytd-live-chat-frame#chat');
    console.log('yt-twitch-chat: promptForChannelAssociation called. ChatFrame found:', !!chatFrame);
    if (!chatFrame) {
      console.log('yt-twitch-chat: No chat frame found, not showing prompt');
      return;
    }

    // Show prompt after a short delay to let YouTube finish loading
    console.log('yt-twitch-chat: Scheduling prompt to show in 2 seconds');
    setTimeout(() => {
      console.log('yt-twitch-chat: About to show channel prompt');
      this.showChannelPrompt(true); // true = new channel prompt
    }, 2000);
  }

  private showChannelPrompt(isNewChannel: boolean = false): void {
    console.log('yt-twitch-chat: showChannelPrompt called. originalChatContainer:', !!this.originalChatContainer);
    if (!this.originalChatContainer) {
      console.log('yt-twitch-chat: No originalChatContainer, cannot show prompt');
      return;
    }

    // Remove existing prompt if present
    const existingPrompt = document.querySelector('#twitch-channel-prompt');
    if (existingPrompt) {
      existingPrompt.remove();
    }

    // Create channel prompt overlay that matches chat container dimensions
    const promptContainer = document.createElement('div');
    promptContainer.id = 'twitch-channel-prompt';

    // Copy styles from chat container to match exactly, including video player height in default mode
    const computedStyle = window.getComputedStyle(this.originalChatContainer as Element);
    const isTheaterMode = document.querySelector('.ytd-watch-flexy[theater]') !== null;

    let heightValue = computedStyle.height;

    // For default mode, match the video player height
    if (!isTheaterMode) {
      const videoElement = document.querySelector('#movie_player, .html5-video-player, video') as HTMLElement;
      if (videoElement) {
        const videoRect = videoElement.getBoundingClientRect();
        heightValue = `${videoRect.height}px`;
      }
    }

    promptContainer.style.cssText = `
      width: ${computedStyle.width};
      height: ${heightValue};
      position: ${computedStyle.position === 'static' ? 'relative' : computedStyle.position};
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
    const description = 'Would you like to associate a Twitch chat with this YouTube channel?';
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
                 value="${suggestedChannel.toLowerCase().replace(/\s+/g, '')}"
                 style="width: 100%; padding: 10px; border: 1px solid var(--yt-spec-10-percent-layer);
                        border-radius: 4px; font-size: 14px; background: var(--yt-spec-base-background);
                        color: var(--yt-spec-text-primary); box-sizing: border-box;">
        </div>

        <div style="display: flex; gap: 8px; width: 100%;">
          <button id="cancel-twitch-setup" style="flex: 1; padding: 10px; border: 1px solid var(--yt-spec-10-percent-layer);
                  background: transparent; color: var(--yt-spec-text-primary); border-radius: 4px; cursor: pointer; font-size: 13px;">
            Keep YouTube Chat
          </button>
          <button id="confirm-twitch-setup" style="flex: 1; padding: 10px; border: none; background: #9146ff;
                  color: white; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;">
            Connect Twitch
          </button>
        </div>

        ${suggestedChannel
    ? `<p style="margin: 12px 0 0 0; color: var(--yt-spec-text-secondary); font-size: 11px;">
              Auto-detected from: ${suggestedChannel}
            </p>`
    : ''
}
      </div>
    `;

    // Position the prompt as a sibling to chat container
    this.originalChatContainer.parentNode!.insertBefore(promptContainer, this.originalChatContainer.nextSibling);

    // Hide the original chat while showing prompt
    (this.originalChatContainer as HTMLElement).style.display = 'none';

    // Handle button clicks
    const channelInput = promptContainer.querySelector('#twitch-channel-input') as HTMLInputElement;
    const cancelBtn = promptContainer.querySelector('#cancel-twitch-setup') as HTMLButtonElement;
    const confirmBtn = promptContainer.querySelector('#confirm-twitch-setup') as HTMLButtonElement;

    // Focus input and select text if pre-filled
    channelInput.focus();
    if (channelInput.value) {
      channelInput.select();
    }

    // Enter key submits
    channelInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        confirmBtn.click();
      }
    });

    cancelBtn.addEventListener('click', () => {
      promptContainer.remove();
      (this.originalChatContainer as HTMLElement).style.display = 'block';

      // For new channels, save the preference to use YouTube chat
      if (isNewChannel) {
        this.useTwitchChat = false;
        this.twitchChannel = ''; // No associated Twitch channel
        this.saveChannelSpecificSettings();
      }
    });

    confirmBtn.addEventListener('click', () => {
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
        this.saveChannelSpecificSettings();

        // Remove prompt and setup chat
        promptContainer.remove();
        (this.originalChatContainer as HTMLElement).style.display = 'block';
        this.createTwitchChatContainer();
        this.updateChatDisplay();
      } else {
        channelInput.style.borderColor = '#ff4444';
        channelInput.focus();
      }
    });
  }

  private setupChatReplacer(): void {
    // Only run on YouTube watch pages
    if (!window.location.href.includes('/watch')) {
      return;
    }

    // Wait for chat container to be available
    this.waitForChatContainer().then(() => {
      console.log('yt-twitch-chat: Chat container found. Channel:', this.currentYouTubeChannel, 'TwitchChannel:', this.twitchChannel);
      if (this.twitchChannel && this.useTwitchChat) {
        console.log('yt-twitch-chat: Creating Twitch chat container');
        this.createTwitchChatContainer();
        this.updateChatDisplay();
      } else if (!this.twitchChannel) {
        // No Twitch channel set for this YouTube channel, show prompt
        console.log('yt-twitch-chat: No Twitch channel set, showing prompt');
        this.promptForChannelAssociation();
      }
    });
  }

  private waitForChatContainer(maxAttempts: number = 30): Promise<void> {
    return new Promise((resolve) => {
      let attempts = 0;

      const checkForChat = () => {
        const chatContainer = document.querySelector('ytd-live-chat-frame#chat');

        if (chatContainer) {
          this.originalChatContainer = chatContainer;
          console.log('yt-twitch-chat: Found chat container');
          resolve();
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          console.log('yt-twitch-chat: Could not find chat container after maximum attempts');
          resolve();
          return;
        }

        setTimeout(checkForChat, 1000);
      };

      checkForChat();
    });
  }

  private createTwitchChatContainer(): void {
    // Remove existing Twitch chat if present
    const existingTwitchIframe = document.querySelector('#twitch-chat-iframe');
    existingTwitchIframe?.remove();

    if (!this.originalChatContainer || !this.twitchChannel) {
      return;
    }

    // Find the chat frame container
    const chatFrame = document.querySelector('ytd-live-chat-frame#chat');
    if (!chatFrame) {
      return;
    }

    const youtubeIframe = document.querySelector('#chatframe') as HTMLIFrameElement;
    const twitchIframe = document.createElement('iframe');
    twitchIframe.id = 'twitch-chat-iframe';

    if (youtubeIframe) {
      twitchIframe.style.cssText = youtubeIframe.style.cssText;
      // Convert DOMTokenList to array for spreading
      twitchIframe.classList.add(...Array.from(youtubeIframe.classList));
    }

    const isDarkMode = this.detectDarkMode();
    twitchIframe.src = `https://www.twitch.tv/embed/${this.twitchChannel}/chat?parent=${window.location.hostname}${
      isDarkMode ? '&darkpopout' : ''
    }`;

    // Insert Twitch iframe into the chat frame
    chatFrame.appendChild(twitchIframe);
  }

  private updateChatDisplay(): void {
    const youtubeIframe = document.querySelector('#chatframe') as HTMLElement;
    const twitchIframe = document.querySelector('#twitch-chat-iframe') as HTMLElement;

    if (this.useTwitchChat && this.twitchChannel && twitchIframe) {
      // Show Twitch chat, hide YouTube chat
      if (youtubeIframe) {
        youtubeIframe.style.display = 'none';
      }
      twitchIframe.style.display = 'block';
    } else {
      // Show YouTube chat, hide Twitch chat
      if (youtubeIframe) {
        youtubeIframe.style.display = 'block';
      }
      if (twitchIframe) {
        twitchIframe.style.display = 'none';
      }
    }
  }

  private detectDarkMode(): boolean {
    // Check YouTube's dark mode
    const html = document.documentElement;
    const isDarkMode =
      html.hasAttribute('dark') ||
      html.classList.contains('dark') ||
      document.body.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    return isDarkMode;
  }
}

// Initialize the chat replacer
const _chatReplacer = new YouTubeTwitchChatReplacer();
