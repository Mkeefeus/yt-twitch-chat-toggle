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
  preloadBothChats?: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface StorageMessageRequest {
  action: 'switchStorageType';
}

const applyPrefix = (message: string) =>
  `[${new Date().toISOString()}] [StorageWorker]: ${message}`;

export class YoutubeTwitchChatStorageWorker {
  private storage?: chrome.storage.StorageArea;
  private STORAGE_KEY: string = 'yt_twitch_chat_settings';
  constructor() {
    this.init();
  }

  private async init() {
    await Promise.all([this.initializeDefaultSettings(), this.setupMessageListener()]);
    this.storage = await this.getStorageApi();
    this.setupStorageListener();
    console.log(applyPrefix('Storage initialized'));
  }

  private async initializeDefaultSettings(): Promise<void> {
    try {
      console.log(applyPrefix('Checking for existing settings'));
      // Check both storages to see if any settings exist
      const [localResult, syncResult] = await Promise.all([
        chrome.storage.local.get(this.STORAGE_KEY),
        chrome.storage.sync.get(this.STORAGE_KEY)
      ]);

      const hasLocalSettings =
        localResult[this.STORAGE_KEY] && Object.keys(localResult[this.STORAGE_KEY]).length > 0;
      const hasSyncSettings =
        syncResult[this.STORAGE_KEY] && Object.keys(syncResult[this.STORAGE_KEY]).length > 0;

      // Only initialize defaults if no settings exist anywhere
      if (hasLocalSettings || hasSyncSettings) {
        console.log(applyPrefix('Existing settings found, skipping default initialization'));
        return;
      }
      console.log(applyPrefix('No existing settings found, initializing defaults'));

      const defaultSettings: ExtensionSettings = {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        theme: 'system' // Default to system theme
      };

      // Save to local storage by default
      await chrome.storage.local.set({ [this.STORAGE_KEY]: defaultSettings });
      console.log(applyPrefix('Default settings initialized'));
    } catch (error) {
      console.error(applyPrefix('Error initializing default settings:'), error);
    }
  }

  private async getStorageApi(): Promise<chrome.storage.StorageArea> {
    try {
      const localStorage = await chrome.storage.local.get([this.STORAGE_KEY]);
      const syncStorage = await chrome.storage.sync.get([this.STORAGE_KEY]);
      const localSettings = localStorage[this.STORAGE_KEY] as ExtensionSettings | undefined;
      const syncSettings = syncStorage[this.STORAGE_KEY] as ExtensionSettings | undefined;

      if (localSettings) {
        console.log(applyPrefix('Using local storage'));
        return chrome.storage.local;
      } else if (syncSettings) {
        console.log(applyPrefix('Using sync storage'));
        return chrome.storage.sync;
      } else {
        console.error(applyPrefix('No storage API found, using local storage'));
        return chrome.storage.local;
      }
    } catch (error) {
      console.error(applyPrefix('yt-twitch-chat: Error getting storage API:'));
      return chrome.storage.local;
    }
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener(
      (
        message: StorageMessageRequest,
        _sender: chrome.runtime.MessageSender,
        _sendResponse: (response?: Record<string, unknown>) => void
      ) => {
        switch (message.action) {
          case 'switchStorageType':
            // this.handleSwitchStorageType();
            console.log(applyPrefix(`Received request to switch storage type from: ${_sender}`));
            break;
        }
      }
    );
  }

  private setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (changes[this.STORAGE_KEY]?.newValue?.lastUpdated) {
        return; // Ignore changes to lastUpdated
      }
      if (area === 'local' || area === 'sync') {
        console.log(applyPrefix(`Storage changed in ${area}: ${JSON.stringify(changes)}`));
      }
      this.storage?.set({ [this.STORAGE_KEY]: { lastUpdated: Date.now() } });
    });
  }
}
