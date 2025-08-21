import { log } from './helpers';

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
  preloadBothChats?: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface MessageRequest {
  action: 'toggleChat' | 'switchStorageType' | 'saveChannelSettings';
  preferredChat?: 'youtube' | 'twitch';
  twitchChannel?: string;
}

class YoutubeTwitchChatReplacer {
  private storage?: chrome.storage.StorageArea;
  private STORAGE_KEY: string = 'yt_twitch_settings';

  constructor() {
    this.init();
  }

  async init() {
    await Promise.all([this.initializeDefaultSettings(), this.setupMessageListener()]);
    this.storage = await this.getStorageApi();
    this.setupStorageListener();
    log('Storage initialized');
  }

  private async initializeDefaultSettings(): Promise<void> {
    try {
      log('Checking for existing settings');
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
        log('Existing settings found, skipping default initialization');
        return;
      }
      log('No existing settings found, initializing defaults');

      const defaultSettings: ExtensionSettings = {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        theme: 'system' // Default to system theme
      };

      // Save to local storage by default
      await chrome.storage.local.set({ [this.STORAGE_KEY]: defaultSettings });
      log('Default settings initialized');
    } catch (error) {
      log('Error initializing default settings:', 'error');
    }
  }

  private async getStorageApi(): Promise<chrome.storage.StorageArea> {
    try {
      const localStorage = await chrome.storage.local.get([this.STORAGE_KEY]);
      const syncStorage = await chrome.storage.sync.get([this.STORAGE_KEY]);
      const localSettings = localStorage[this.STORAGE_KEY] as ExtensionSettings | undefined;
      const syncSettings = syncStorage[this.STORAGE_KEY] as ExtensionSettings | undefined;

      if (localSettings) {
        log('Using local storage');
        return chrome.storage.local;
      } else if (syncSettings) {
        log('Using sync storage');
        return chrome.storage.sync;
      } else {
        log('No storage API found, using local storage', 'error');
        return chrome.storage.local;
      }
    } catch (error) {
      log('yt-twitch-chat: Error getting storage API:', 'error');
      return chrome.storage.local;
    }
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener(
      (
        message: MessageRequest,
        _sender: chrome.runtime.MessageSender,
        _sendResponse: (response?: Record<string, unknown>) => void
      ) => {
        switch (message.action) {
          case 'switchStorageType':
            this.handleSwitchStorageType();
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
        log(`Storage changed in ${area}: ${JSON.stringify(changes)}`);
      }
      this.storage?.set({ [this.STORAGE_KEY]: { lastUpdated: Date.now() } });
    });
  }

  private async handleSwitchStorageType() {
    try {
      log('Switching storage type');
      const currentStorage = await this.getStorageApi();
      const newStorage =
        currentStorage === chrome.storage.local ? chrome.storage.sync : chrome.storage.local;

      // Migrate settings to the new storage
      const settings = await currentStorage.get(this.STORAGE_KEY);
      await newStorage.set({ [this.STORAGE_KEY]: settings });

      log(
        `Switched storage from ${currentStorage === chrome.storage.local ? 'local' : 'sync'} to ${
          newStorage === chrome.storage.local ? 'local' : 'sync'
        }`
      );
      this.storage = newStorage;
      currentStorage.remove(this.STORAGE_KEY);
      const currentChannel = ''; //todo
      this.loadChannelSettings(currentChannel);
    } catch (error) {
      log(`Error switching storage type: ${error}`, 'error');
      return;
    }
  }

  private async loadChannelSettings(channel: string): Promise<void> {
    try {
      log(`Loading settings for channel: ${channel}`);
      if (!this.storage) {
        log('No storage available', 'error');
        return undefined;
      }
      const storage = await this.storage.get(this.STORAGE_KEY);
      const settings = storage[this.STORAGE_KEY] as ExtensionSettings | undefined;
      if (!settings || !settings.channels || !settings.channels[channel]) {
        log(`No settings found for channel: ${channel}`, 'warn');
        return;
      }
    } catch (error) {
      log(`Error loading settings for channel: ${channel}`, 'error');
    }
  }
}

new YoutubeTwitchChatReplacer();
