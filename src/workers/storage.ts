import { formatConsoleMessage } from '../utils';
import type { ChannelSettings, ExtensionSettings } from '../types';

export class YoutubeTwitchChatStorageWorker {
  private STORAGE_KEY: string = 'yt_twitch_chat_settings';

  constructor() {
    this.init();
  }

  private async init() {
    this.setupEventlisteners();
    await this.initializeDefaultSettings();
    console.log(formatConsoleMessage('StorageWorker', 'Storage initialized'));
  }

  private async initializeDefaultSettings(): Promise<void> {
    try {
      console.log(formatConsoleMessage('StorageWorker', 'Checking for existing settings'));
      // Check both storages to see if any settings exist
      const [localResult, syncResult] = await Promise.all([
        chrome.storage.local.get(this.STORAGE_KEY),
        chrome.storage.sync.get(this.STORAGE_KEY)
      ]);

      const hasLocalSettings =
        localResult &&
        localResult[this.STORAGE_KEY] &&
        Object.keys(localResult[this.STORAGE_KEY]).length > 0;
      const hasSyncSettings =
        syncResult &&
        syncResult[this.STORAGE_KEY] &&
        Object.keys(syncResult[this.STORAGE_KEY]).length > 0;

      // Only initialize defaults if no settings exist anywhere
      if (hasLocalSettings || hasSyncSettings) {
        console.log(
          formatConsoleMessage(
            'StorageWorker',
            'Existing settings found, skipping default initialization'
          )
        );
        return;
      }
      console.log(
        formatConsoleMessage('StorageWorker', 'No existing settings found, initializing defaults')
      );

      const defaultSettings: ExtensionSettings = {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        keepChatsLoaded: false,
        theme: 'system',
        useSync: false // Default to local storage
      };

      // Save to local storage by default
      await chrome.storage.local.set({ [this.STORAGE_KEY]: defaultSettings });
      console.log(formatConsoleMessage('StorageWorker', 'Default settings initialized'));
    } catch (error) {
      console.error(
        formatConsoleMessage('StorageWorker', 'Error initializing default settings:'),
        error
      );
    }
  }

  private setupEventlisteners() {
    chrome.storage.onChanged.addListener((changes) => {
      if (
        changes[this.STORAGE_KEY] &&
        changes[this.STORAGE_KEY].newValue?.useSync !== changes[this.STORAGE_KEY].oldValue?.useSync
      ) {
        console.log(
          formatConsoleMessage('StorageWorker', 'useSync setting changed, triggering migration')
        );
        this.migrateStorage();
      }
    });
  }

  private async getStorageApi(): Promise<chrome.storage.StorageArea> {
    try {
      const localStorage = await chrome.storage.local.get([this.STORAGE_KEY]);
      const syncStorage = await chrome.storage.sync.get([this.STORAGE_KEY]);
      const localSettings = localStorage[this.STORAGE_KEY] as ExtensionSettings | undefined;
      const syncSettings = syncStorage[this.STORAGE_KEY] as ExtensionSettings | undefined;

      if (localSettings) {
        return chrome.storage.local;
      } else if (syncSettings) {
        return chrome.storage.sync;
      } else {
        console.log(
          formatConsoleMessage('StorageWorker', 'No storage API found, using local storage')
        );
        return chrome.storage.local;
      }
    } catch (error) {
      console.error(
        formatConsoleMessage('StorageWorker', 'yt-twitch-chat: Error getting storage API:')
      );
      return chrome.storage.local;
    }
  }

  public async getSettings(): Promise<ExtensionSettings | undefined> {
    const storage = await this.getStorageApi();
    const settings = await storage.get([this.STORAGE_KEY]);
    if (!settings || !settings[this.STORAGE_KEY]) {
      console.error(formatConsoleMessage('StorageWorker', 'No settings found: '), settings);
      return;
    }
    return settings[this.STORAGE_KEY] as ExtensionSettings;
  }

  public async updateSettings(data: Partial<ExtensionSettings>): Promise<boolean> {
    if (!data) return false;
    const settings = await this.getSettings();
    if (!settings) return false;

    const updatedSettings = { ...settings, ...data, lastUpdated: Date.now() };
    const storage = await this.getStorageApi();
    await storage.set({ [this.STORAGE_KEY]: updatedSettings });
    return true;
  }

  public async migrateStorage(): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) return;

    try {
      console.log(formatConsoleMessage('StorageWorker', 'Checking storage type for migration'));
      const currentStorage = await this.getStorageApi();
      if (currentStorage === chrome.storage.sync && !settings.useSync) {
        console.log(formatConsoleMessage('StorageWorker', 'Migrating settings to local storage'));
        await chrome.storage.local.set({ [this.STORAGE_KEY]: settings });
        await chrome.storage.sync.remove([this.STORAGE_KEY]);
      } else if (currentStorage === chrome.storage.local && settings.useSync) {
        console.log(formatConsoleMessage('StorageWorker', 'Migrating settings to sync storage'));
        await chrome.storage.sync.set({ [this.STORAGE_KEY]: settings });
        await chrome.storage.local.remove([this.STORAGE_KEY]);
      }
      console.log(formatConsoleMessage('StorageWorker', 'Storage migration completed'));
    } catch (error) {
      console.error(formatConsoleMessage('StorageWorker', 'Error migrating storage: '), error);
    }
  }

  public async getChannelSettings(channelId: string): Promise<ChannelSettings | undefined> {
    if (!channelId) return;
    const settings = await this.getSettings();
    if (!settings) return;

    return settings.channels[channelId];
  }

  public async updateChannelSettings(
    channelId: string,
    data: Partial<ChannelSettings>
  ): Promise<boolean> {
    if (!channelId || !data) return false;
    const settings = await this.getSettings();
    if (!settings) return false;

    const existingChannelSettings = settings.channels[channelId] || {};
    const updatedChannelSettings: ChannelSettings = { ...existingChannelSettings, ...data };
    const updatedChannels: ExtensionSettings['channels'] = {
      ...settings.channels,
      [channelId]: updatedChannelSettings
    };

    const updatedSettings: ExtensionSettings = {
      ...settings,
      channels: updatedChannels,
      lastUpdated: Date.now()
    };
    const storage = await this.getStorageApi();
    await storage.set({ [this.STORAGE_KEY]: updatedSettings });
    return true;
  }

  public async getCurrentChannel(): Promise<string | undefined> {
    const result = await chrome.storage.session.get('current_channel');
    return result.current_channel;
  }
}
