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
  preloadBothChats?: boolean; // New setting for preloading behavior
}

interface MessageRequest {
  action: 'toggleChat' | 'getState' | 'settingsUpdated' | 'setStorageType' | 'setPreloadSetting';
  preferredChat?: 'youtube' | 'twitch';
  twitchChannel?: string;
  useSync?: boolean;
  preloadBothChats?: boolean;
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
  private originalYouTubeChatSrc: string = '';
  private originalYouTubeIframeHTML: string = '';
  private observer: MutationObserver | null = null;
  private youtubeIframe: HTMLIFrameElement | null = null;
  private twitchIframe: HTMLIFrameElement | null = null;
  private promptIframe: HTMLIFrameElement | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // Initialize default settings first
    await this.initializeDefaultSettings();

    // Set up message listener for popup communication
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

  private async initializeDefaultSettings(): Promise<void> {
    try {
      // Check both storages to see if any settings exist
      const [localResult, syncResult] = await Promise.all([
        chrome.storage.local.get(['yt_twitch_settings']),
        chrome.storage.sync.get(['yt_twitch_settings'])
      ]);

      const hasLocalSettings = localResult.yt_twitch_settings && Object.keys(localResult.yt_twitch_settings).length > 0;
      const hasSyncSettings = syncResult.yt_twitch_settings && Object.keys(syncResult.yt_twitch_settings).length > 0;

      // Only initialize defaults if no settings exist anywhere
      if (hasLocalSettings || hasSyncSettings) {
        console.log('yt-twitch-chat: Existing settings found, skipping default initialization');
        return;
      }
      console.log('yt-twitch-chat: No existing settings found, initializing defaults');

      const defaultSettings: ExtensionSettings = {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        useSync: false, // Default to local storage
        preloadBothChats: false // Default to load one chat at a time
      };

      // Save to local storage by default
      await chrome.storage.local.set({ yt_twitch_settings: defaultSettings });
      console.log('yt-twitch-chat: Default settings initialized');
    } catch (error) {
      console.error('yt-twitch-chat: Error initializing default settings:', error);
    }
  }

  private async initializeAfterDOM(): Promise<void> {
    // Only clear Twitch chat if it actually exists from previous page loads
    const existingTwitchIframe = document.querySelector('#twitch-chat-iframe') as HTMLIFrameElement;
    if (existingTwitchIframe) {
      console.log('yt-twitch-chat: Removing existing Twitch chat from previous page load');
      existingTwitchIframe.remove();
      this.twitchIframe = null; // Clear the reference
    }

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
      console.error('yt-twitch-chat: Could not detect YouTube channel name');
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
        // Fallback defaults (should rarely be used since initializeDefaultSettings runs first)
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        useSync: false, // Default to local storage
        preloadBothChats: false // Default to load one chat at a time
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
        console.log(`yt-twitch-chat: No settings found for ${this.currentYouTubeChannel}`);
      }

    } catch (error) {
      console.error('yt-twitch-chat: Error loading settings:', error);
    }
  }

  private async saveChannelSpecificSettings(): Promise<void> {
    try {
      if (!this.currentYouTubeChannel || this.currentYouTubeChannel === 'unknown') {
        console.error('yt-twitch-chat: Cannot save settings - invalid channel name:', this.currentYouTubeChannel);
        return;
      }

      // Load existing settings structure from appropriate storage
      const storage = await this.getStorageApi();
      const result = await storage.get(['yt_twitch_settings']);
      const allSettings: ExtensionSettings = result.yt_twitch_settings || {
        // Fallback defaults (should rarely be used since initializeDefaultSettings runs first)
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        useSync: await this.isSyncStorageEnabled(),
        preloadBothChats: false // Default to load one chat at a time
      };

      // Update settings for this channel using current instance values
      allSettings.channels[this.currentYouTubeChannel] = {
        twitchChannel: this.twitchChannel,
        preferredChat: this.useTwitchChat ? 'twitch' : 'youtube',
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

    // Reload settings from storage
    await this.loadSettings();

    // If a channel association was made (twitchChannel is now set) and there's a prompt showing, clear it
    if (this.twitchChannel && this.promptIframe) {
      console.log('yt-twitch-chat: Channel association made from popup, clearing prompt');
      this.clearPrompt();
      if (this.youtubeIframe) {
        this.youtubeIframe.style = '';
      }
    }

    // Update the chat display based on new settings
    await this.updateChatDisplay();
  }

  private async isSyncStorageEnabled(): Promise<boolean> {
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
    const useSync = await this.isSyncStorageEnabled();
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
          settingsToUse = syncResult.yt_twitch_settings || {
            version: 1,
            channels: {},
            lastUpdated: Date.now(),
            preloadBothChats: false
          };
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
          settingsToUse = localResult.yt_twitch_settings || {
            version: 1,
            channels: {},
            lastUpdated: Date.now(),
            preloadBothChats: false
          };
          settingsToUse.useSync = false;
          await chrome.storage.local.set({ yt_twitch_settings: settingsToUse });
        }
      }

      console.log('yt-twitch-chat: Storage type changed successfully');
    } catch (error) {
      console.error('yt-twitch-chat: Error setting storage type:', error);
    }
  }

  private async getPreloadSetting(): Promise<boolean> {
    try {
      const storage = await this.getStorageApi();
      const result = await storage.get(['yt_twitch_settings']);
      const settings: ExtensionSettings = result.yt_twitch_settings;
      return settings?.preloadBothChats === true; // Default to false (load one at a time)
    } catch (error) {
      console.error('yt-twitch-chat: Error getting preload setting:', error);
      return false; // Default to false (load one at a time)
    }
  }

  private async setPreloadSetting(preloadBothChats: boolean): Promise<void> {
    try {
      console.log(`yt-twitch-chat: Setting preload behavior to: ${preloadBothChats ? 'both chats' : 'active only'}`);

      const storage = await this.getStorageApi();
      const result = await storage.get(['yt_twitch_settings']);
      const settings: ExtensionSettings = result.yt_twitch_settings || {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        useSync: await this.isSyncStorageEnabled(),
        preloadBothChats: false // Default to load one chat at a time
      };

      settings.preloadBothChats = preloadBothChats;
      settings.lastUpdated = Date.now();

      await storage.set({ yt_twitch_settings: settings });

      // If switching to single-chat mode and currently have both loaded, clean up
      if (!preloadBothChats && this.twitchChannel) {
        if (this.twitchIframe && !this.useTwitchChat) {
          // If we're showing YouTube chat, remove the Twitch iframe to save resources
          console.log('yt-twitch-chat: Removing inactive Twitch iframe (preload disabled)');
          this.twitchIframe.remove();
          this.twitchIframe = null;
        } else if (this.youtubeIframe && this.useTwitchChat) {
          // If we're showing Twitch chat, remove the YouTube iframe to save resources
          console.log('yt-twitch-chat: Removing inactive YouTube iframe (preload disabled)');
          this.youtubeIframe.remove();
          this.youtubeIframe = null;
        }

        // Ensure the active chat is properly loaded
        if (!this.twitchIframe && this.useTwitchChat) {
          // If we're showing Twitch chat but it's not loaded, create it
          this.createTwitchChatContainer();
        }
      }
      // If switching to preload mode, ensure both chats are loaded
      else if (preloadBothChats && this.twitchChannel) {
        // Ensure both iframes exist for seamless switching
        if (!this.twitchIframe) {
          console.log('yt-twitch-chat: Creating Twitch iframe for preload mode');
          this.createTwitchChatContainer();
        }

        if (!this.youtubeIframe) {
          console.log('yt-twitch-chat: Restoring YouTube iframe for preload mode');
          this.restoreYouTubeIframe();
        }

        // Set their visibility based on current preference
        await this.updateChatDisplay();
      }

      console.log('yt-twitch-chat: Preload setting changed successfully');
    } catch (error) {
      console.error('yt-twitch-chat: Error setting preload behavior:', error);
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
          if (this.useTwitchChat && this.twitchChannel && !this.twitchIframe) {
            this.createTwitchChatContainer();
          }

          // Update the display immediately
          await this.updateChatDisplay();

          // Save the new settings
          await this.saveChannelSpecificSettings();

          sendResponse({ success: true, useTwitchChat: this.useTwitchChat });
          break;
        case 'getState': {
          const useSync = await this.isSyncStorageEnabled();
          const response: StateResponse = {
            useTwitchChat: this.useTwitchChat,
            twitchChannel: this.twitchChannel,
            currentYouTubeChannel: this.currentYouTubeChannel,
            isActive: !!this.twitchIframe,
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
        case 'setPreloadSetting':
          if (message.preloadBothChats !== undefined) {
            await this.setPreloadSetting(message.preloadBothChats);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'preloadBothChats parameter required' });
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
        await this.updateChatDisplay();
      } else {
        // No Twitch channel set for this YouTube channel
        console.log('yt-twitch-chat: No Twitch channel set for this YouTube channel');
      }
    }
  }

  private setupChatReplacer(): void {
    // Only run on YouTube watch pages
    if (!window.location.href.includes('/watch')) {
      return;
    }

    // Wait for chat container to be available
    this.waitForChatContainer().then(async () => {
      console.log('yt-twitch-chat: Chat container found. Channel:', this.currentYouTubeChannel, 'TwitchChannel:', this.twitchChannel);
      if (this.twitchChannel) {
        const preloadBothChats = await this.getPreloadSetting();

        // Create Twitch chat container based on preload setting
        if (preloadBothChats || this.useTwitchChat) {
          console.log('yt-twitch-chat: Creating Twitch chat container for saved association');
          this.createTwitchChatContainer();
        }
        await this.updateChatDisplay();
      } else {
        // No Twitch channel set for this YouTube channel - show prompt
        console.log('yt-twitch-chat: No Twitch channel set for this YouTube channel - showing prompt');
        this.showChannelPrompt();
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

          // Capture the original YouTube chat iframe for restoration later
          const youtubeIframe = chatContainer.querySelector('#chatframe') as HTMLIFrameElement;
          if (youtubeIframe) {
            // Store reference to YouTube iframe
            this.youtubeIframe = youtubeIframe;

            // Store the complete iframe HTML for full restoration
            this.originalYouTubeIframeHTML = youtubeIframe.outerHTML;
            console.log('yt-twitch-chat: Captured original YouTube iframe HTML');

            // Try to get the iframe URL using multiple methods
            let documentUrl = '';

            // Method 1: Check if src attribute exists
            if (youtubeIframe.src && !youtubeIframe.src.includes('about:blank')) {
              documentUrl = youtubeIframe.src;
              console.log('yt-twitch-chat: Got iframe URL from src attribute:', documentUrl);
            }
            // Method 2: Try to get URL from contentDocument.URL (if accessible)
            else if (youtubeIframe.contentDocument) {
              try {
                const contentUrl = youtubeIframe.contentDocument.URL;
                if (contentUrl && !contentUrl.includes('about:blank')) {
                  documentUrl = contentUrl;
                  console.log('yt-twitch-chat: Got iframe URL from contentDocument.URL:', documentUrl);
                }
              } catch {
                console.log('yt-twitch-chat: Cannot access contentDocument.URL (likely cross-origin)');
              }
            }
            // Method 3: Try to get URL from contentWindow.location (if accessible)
            if (!documentUrl && youtubeIframe.contentWindow) {
              try {
                const windowUrl = youtubeIframe.contentWindow.location.href;
                if (windowUrl && !windowUrl.includes('about:blank')) {
                  documentUrl = windowUrl;
                  console.log('yt-twitch-chat: Got iframe URL from contentWindow.location:', documentUrl);
                }
              } catch {
                console.log('yt-twitch-chat: Cannot access contentWindow.location (likely cross-origin)');
              }
            }

            if (documentUrl) {
              this.originalYouTubeChatSrc = documentUrl;
              console.log('yt-twitch-chat: Captured original YouTube chat URL:', documentUrl);
            } else {
              console.log('yt-twitch-chat: Could not determine YouTube chat iframe URL - will use HTML restoration only');
              // Try again after a short delay in case the iframe is still loading
              setTimeout(() => {
                this.attemptDelayedUrlCapture(youtubeIframe);
              }, 2000);
            }
          }

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

  private attemptDelayedUrlCapture(youtubeIframe: HTMLIFrameElement): void {
    if (this.originalYouTubeChatSrc) {
      // Already have a URL, no need to try again
      return;
    }

    console.log('yt-twitch-chat: Attempting delayed URL capture');
    let documentUrl = '';

    // Try the same methods again with a delay
    if (youtubeIframe.src && !youtubeIframe.src.includes('about:blank')) {
      documentUrl = youtubeIframe.src;
      console.log('yt-twitch-chat: Got iframe URL from delayed src check:', documentUrl);
    } else if (youtubeIframe.contentDocument) {
      try {
        const contentUrl = youtubeIframe.contentDocument.URL;
        if (contentUrl && !contentUrl.includes('about:blank')) {
          documentUrl = contentUrl;
          console.log('yt-twitch-chat: Got iframe URL from delayed contentDocument.URL check:', documentUrl);
        }
      } catch {
        console.log('yt-twitch-chat: Cannot access contentDocument.URL in delayed attempt');
      }
    }

    if (documentUrl) {
      this.originalYouTubeChatSrc = documentUrl;
      console.log('yt-twitch-chat: Successfully captured YouTube chat URL on delayed attempt:', documentUrl);
    } else {
      console.log('yt-twitch-chat: Delayed URL capture attempt failed - restoration will use iframe recreation only');
    }
  }

  private createTwitchChatContainer(): void {
    // Remove existing Twitch chat if present
    const existingTwitchIframe = document.querySelector('#twitch-chat-iframe');
    if (existingTwitchIframe) {
      existingTwitchIframe.remove();
      this.twitchIframe = null; // Clear the reference
    }

    if (!this.originalChatContainer || !this.twitchChannel) {
      return;
    }

    // Find the chat frame container
    const chatFrame = document.querySelector('ytd-live-chat-frame#chat');
    if (!chatFrame) {
      return;
    }

    const twitchIframe = document.createElement('iframe');
    twitchIframe.id = 'twitch-chat-iframe';

    // Store reference to Twitch iframe
    this.twitchIframe = twitchIframe;

    if (this.youtubeIframe) {
      twitchIframe.classList.add(...Array.from(this.youtubeIframe.classList));
    }

    const isDarkMode = this.detectDarkMode();
    twitchIframe.src = `https://www.twitch.tv/embed/${this.twitchChannel}/chat?parent=${window.location.hostname}${
      isDarkMode ? '&darkpopout' : ''
    }`;

    // Initialize opacity state based on current preference
    if (this.useTwitchChat) {
      twitchIframe.style.opacity = '1';
      twitchIframe.style.pointerEvents = 'auto';
      twitchIframe.style.zIndex = '1000';
      twitchIframe.tabIndex = 0;
      twitchIframe.setAttribute('aria-hidden', 'false');
    } else {
      twitchIframe.style.opacity = '0';
      twitchIframe.style.pointerEvents = 'none';
      twitchIframe.style.zIndex = '1';
      twitchIframe.tabIndex = -1;
      twitchIframe.setAttribute('inert', '');
      twitchIframe.setAttribute('aria-hidden', 'true');
    }

    // Insert Twitch iframe into the chat frame
    chatFrame.appendChild(twitchIframe);
  }

  private showChannelPrompt(): void {
    if (!this.originalChatContainer) {
      return;
    }

    // Remove any existing prompt iframe
    this.clearPrompt();

    // Find the chat frame container
    const chatFrame = document.querySelector('ytd-live-chat-frame#chat');
    if (!chatFrame) {
      return;
    }

    console.log('yt-twitch-chat: Creating prompt iframe for chat container:', chatFrame);

    // Create prompt iframe
    const promptIframe = document.createElement('iframe');
    promptIframe.id = 'twitch-chat-prompt-iframe';

    // Store reference to prompt iframe
    this.promptIframe = promptIframe;

    // promptIframe.style.flexGrow = '1';
    if (this.youtubeIframe?.classList) {
      promptIframe.classList.add(...Array.from(this.youtubeIframe.classList));
    }

    // Set the prompt URL (will be served from extension)
    promptIframe.src = chrome.runtime.getURL('prompt.html');

    // Hide YouTube iframe while prompt is shown
    if (this.youtubeIframe) {
      this.youtubeIframe.style.display = 'none';
    }

    // Set up message listener for prompt responses
    this.setupPromptMessageListener();

    // Insert prompt iframe into the chat frame
    chatFrame.appendChild(promptIframe);
  }

  private clearPrompt(): void {
    // Remove existing prompt iframe if present
    const existingPromptIframe = document.querySelector('#twitch-chat-prompt-iframe');
    if (existingPromptIframe) {
      existingPromptIframe.remove();
      this.promptIframe = null;
    }
  }

  private setupPromptMessageListener(): void {
    const handlePromptMessage = async (event: MessageEvent) => {
      // Only handle messages from our prompt iframe
      if (event.source !== this.promptIframe?.contentWindow) {
        return;
      }

      const data = event.data;
      if (data.type !== 'TWITCH_CHAT_PROMPT_RESPONSE') {
        return;
      }

      console.log('yt-twitch-chat: Received prompt response:', data);

      if (data.action === 'connect' && data.twitchChannel) {
        // User wants to connect Twitch chat
        this.twitchChannel = data.twitchChannel;
        this.useTwitchChat = true;

        // Save settings
        await this.saveChannelSpecificSettings();

        // Clear the prompt
        this.clearPrompt();

        // Create and show Twitch chat
        this.createTwitchChatContainer();
        await this.updateChatDisplay();

      } else if (data.action === 'keep_youtube') {
        // User wants to keep YouTube chat
        this.twitchChannel = '';
        this.useTwitchChat = false;

        // Save settings (empty Twitch channel means YouTube preference)
        await this.saveChannelSpecificSettings();

        // Clear the prompt
        this.clearPrompt();
      }

      // Restore YouTube iframe visibility
      if (this.youtubeIframe) {
        this.youtubeIframe.style = ''; // Reset styles to default
      }

      // Remove the message listener after handling
      window.removeEventListener('message', handlePromptMessage);
    };

    window.addEventListener('message', handlePromptMessage);
  }

  private restoreYouTubeIframe(): void {
    if (!this.originalChatContainer || !this.originalYouTubeIframeHTML) {
      console.log('yt-twitch-chat: Cannot restore YouTube iframe - missing container or HTML');
      return;
    }

    // Check if YouTube iframe already exists
    const existingYouTubeIframe = this.originalChatContainer.querySelector('#chatframe');
    if (existingYouTubeIframe) {
      console.log('yt-twitch-chat: YouTube iframe already exists, no need to restore');
      // Update reference in case it's not set
      this.youtubeIframe = existingYouTubeIframe as HTMLIFrameElement;
      return;
    }

    // Create a temporary container to parse the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = this.originalYouTubeIframeHTML;
    const restoredIframe = tempContainer.firstElementChild as HTMLIFrameElement;

    if (restoredIframe) {
      // Ensure the restored iframe has the correct src URL if we captured one
      if (this.originalYouTubeChatSrc && (!restoredIframe.src || restoredIframe.src.includes('about:blank'))) {
        console.log('yt-twitch-chat: Setting restored iframe src to captured URL:', this.originalYouTubeChatSrc);
        restoredIframe.src = this.originalYouTubeChatSrc;
      }

      // Insert the restored iframe into the chat container
      this.originalChatContainer.appendChild(restoredIframe);

      // Update the YouTube iframe reference
      this.youtubeIframe = restoredIframe;

      console.log('yt-twitch-chat: Restored YouTube iframe from stored HTML with proper URL');
    } else {
      console.error('yt-twitch-chat: Failed to restore YouTube iframe from HTML');
    }
  }

  private async updateChatDisplay(): Promise<void> {
    // Update iframe references in case they've changed
    this.youtubeIframe = document.querySelector('#chatframe') as HTMLIFrameElement;
    this.twitchIframe = document.querySelector('#twitch-chat-iframe') as HTMLIFrameElement;

    const preloadBothChats = await this.getPreloadSetting();

    if (this.useTwitchChat && this.twitchChannel) {
      // User wants to show Twitch chat

      if (!this.twitchIframe) {
        console.log('yt-twitch-chat: Creating Twitch chat container on demand');
        this.createTwitchChatContainer();
        return; // createTwitchChatContainer will call updateChatDisplay again
      }

      if (preloadBothChats) {
        // PRELOAD MODE: Use opacity for seamless switching, keep both loaded
        console.log('yt-twitch-chat: Using preload mode - hiding YouTube with opacity');

        // Ensure YouTube iframe exists for preload mode
        if (!this.youtubeIframe) {
          console.log('yt-twitch-chat: YouTube iframe missing in preload mode, restoring');
          this.restoreYouTubeIframe();
        }

        if (this.youtubeIframe) {
          this.hideIframe(this.youtubeIframe);
        }
        this.showIframe(this.twitchIframe);
      } else {
        // RESOURCE SAVING MODE: Show Twitch, completely remove YouTube to save maximum resources
        console.log('yt-twitch-chat: Using resource-saving mode - showing Twitch, removing YouTube iframe completely');

        // Completely remove YouTube iframe to save maximum resources
        if (this.youtubeIframe) {
          console.log('yt-twitch-chat: Removing YouTube iframe completely to save resources');
          this.youtubeIframe.remove();
          this.youtubeIframe = null; // Clear the reference
        }

        this.twitchIframe.style.display = 'block';
        this.showIframe(this.twitchIframe);
      }
    } else {
      // User wants to show YouTube chat

      if (preloadBothChats && this.twitchIframe) {
        // PRELOAD MODE: Use opacity for seamless switching, keep both loaded
        console.log('yt-twitch-chat: Using preload mode - hiding Twitch with opacity');

        // Ensure YouTube iframe exists for preload mode
        if (!this.youtubeIframe) {
          console.log('yt-twitch-chat: YouTube iframe missing in preload mode, restoring');
          this.restoreYouTubeIframe();
        }

        if (this.youtubeIframe) {
          this.showIframe(this.youtubeIframe);
        }
        this.hideIframe(this.twitchIframe);
      } else {
        // RESOURCE SAVING MODE: Remove Twitch iframe completely, restore YouTube iframe to save maximum resources
        console.log('yt-twitch-chat: Using resource-saving mode');
        if (this.twitchIframe) {
          console.log('yt-twitch-chat: Removing Twitch iframe to save resources');
          this.twitchIframe.remove();
          this.twitchIframe = null; // Clear the reference
        }

        // Ensure YouTube iframe is restored if it was removed
        if (!this.youtubeIframe) {
          console.log('yt-twitch-chat: YouTube iframe missing, restoring from stored HTML');
          this.restoreYouTubeIframe();
          // The restoreYouTubeIframe method will update this.youtubeIframe
        }
      }
    }
  }

  private showIframe(iframe: HTMLIFrameElement): void {
    iframe.style.opacity = '1';
    iframe.style.pointerEvents = 'auto';
    iframe.style.zIndex = '1000';
    iframe.tabIndex = 0;
    iframe.removeAttribute('inert');
    iframe.setAttribute('aria-hidden', 'false');
  }

  private hideIframe(iframe: HTMLIFrameElement): void {
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '1';
    iframe.tabIndex = -1;
    iframe.setAttribute('inert', '');
    iframe.setAttribute('aria-hidden', 'true');
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
