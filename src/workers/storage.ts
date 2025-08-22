import { formatConsoleMessage } from '../helpers';
import {
  MessageAction,
  type ExtensionSettings,
  type MessageRequest,
  type MessageResponse
} from '../types';

export class YoutubeTwitchChatStorageWorker {
  private storage?: chrome.storage.StorageArea;
  private STORAGE_KEY: string = 'yt_twitch_chat_settings';
  constructor() {
    this.init();
  }

  private async init() {
    await Promise.all([this.initializeDefaultSettings(), this.setupMessageListener()]);
    this.storage = await this.getStorageApi();
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
        localResult[this.STORAGE_KEY] && Object.keys(localResult[this.STORAGE_KEY]).length > 0;
      const hasSyncSettings =
        syncResult[this.STORAGE_KEY] && Object.keys(syncResult[this.STORAGE_KEY]).length > 0;

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

      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultSettings: ExtensionSettings = {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        keepChatsLoaded: false,
        darkMode: prefersDark,
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

  private async getStorageApi(): Promise<chrome.storage.StorageArea> {
    try {
      const localStorage = await chrome.storage.local.get([this.STORAGE_KEY]);
      const syncStorage = await chrome.storage.sync.get([this.STORAGE_KEY]);
      const localSettings = localStorage[this.STORAGE_KEY] as ExtensionSettings | undefined;
      const syncSettings = syncStorage[this.STORAGE_KEY] as ExtensionSettings | undefined;

      if (localSettings) {
        console.log(formatConsoleMessage('StorageWorker', 'Using local storage'));
        return chrome.storage.local;
      } else if (syncSettings) {
        console.log(formatConsoleMessage('StorageWorker', 'Using sync storage'));
        return chrome.storage.sync;
      } else {
        console.error(
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

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener(
      (
        message: MessageRequest,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response?: MessageResponse) => void
      ) => {
        console.log(
          formatConsoleMessage('StorageWorker', `Received message: ${JSON.stringify(message)}`)
        );

        // Handle async operations in a separate function
        this.handleMessageAsync(message, _sender, sendResponse);

        return true; // keeps the message channel open for async responses
      }
    );
  }

  private async handleMessageAsync(
    message: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: MessageResponse) => void
  ) {
    try {
      switch (message.action) {
        case MessageAction.GET_SETTINGS:
          console.log(
            formatConsoleMessage(
              'StorageWorker',
              `Received request to get settings from: ${_sender.tab?.url || 'popup'}`
            )
          );

          const settings = await this.handleGetSettings();
          if (!settings) {
            console.error(formatConsoleMessage('StorageWorker', 'Failed to retrieve settings'));
            sendResponse({
              success: false,
              data: undefined
            });
            return;
          }
          sendResponse({
            success: true,
            data: settings
          });
          break;
        case MessageAction.UPDATE_SETTINGS:
          console.log(
            formatConsoleMessage(
              'StorageWorker',
              `Received request to update settings from: ${_sender.tab?.url || 'popup'}`
            )
          );
          if (!message.data) {
            console.error(formatConsoleMessage('StorageWorker', 'No data provided for update'));
            sendResponse({ success: false });
            return;
          }
          const updateCompleted = await this.handleUpdateSettings(message.data);
          if (!updateCompleted) {
            console.error(formatConsoleMessage('StorageWorker', 'Failed to update settings'));
          }
          if (message.data.useSync !== undefined) {
            this.handleMigrateStorage();
          }
          console.log(formatConsoleMessage('StorageWorker', 'Settings updated successfully'));
          sendResponse({ success: updateCompleted });
          break;
        default:
          console.warn(formatConsoleMessage('StorageWorker', `Unknown action: ${message.action}`));
          sendResponse({ success: false });
      }
    } catch (error) {
      console.error(formatConsoleMessage('StorageWorker', 'Error handling message'), error);
      sendResponse({
        success: false,
        data: undefined
      });
    }
  }
  private async handleGetSettings(): Promise<ExtensionSettings | undefined> {
    const settings = await this.storage?.get([this.STORAGE_KEY]);
    if (!settings || !settings[this.STORAGE_KEY]) {
      console.error(formatConsoleMessage('StorageWorker', 'No settings found'));
      return;
    }
    return settings[this.STORAGE_KEY] as ExtensionSettings;
  }

  private async handleUpdateSettings(data: Partial<ExtensionSettings>): Promise<boolean> {
    if (!data) return false;
    const settings = await this.handleGetSettings();
    if (!settings) return false;

    const updatedSettings = { ...settings, ...data, lastUpdated: Date.now() };
    await this.storage?.set({ [this.STORAGE_KEY]: updatedSettings });
    return true;
  }

  private async handleMigrateStorage(): Promise<void> {
    const settings = await this.handleGetSettings();
    if (!settings) return;

    try {
      console.log(formatConsoleMessage('StorageWorker', 'Checking storage type for migration'));
      const currentStorage = await this.getStorageApi();
      if (currentStorage === chrome.storage.sync && !settings.useSync) {
        console.log(formatConsoleMessage('StorageWorker', 'Migrating settings to local storage'));
        // Migrate settings to local storage
        await chrome.storage.local.set({ [this.STORAGE_KEY]: settings });
        await chrome.storage.sync.remove([this.STORAGE_KEY]);
      } else if (currentStorage === chrome.storage.local && settings.useSync) {
        console.log(formatConsoleMessage('StorageWorker', 'Migrating settings to sync storage'));
        // Migrate settings to sync storage
        await chrome.storage.sync.set({ [this.STORAGE_KEY]: settings });
        await chrome.storage.local.remove([this.STORAGE_KEY]);
        this.storage = await this.getStorageApi();
      }
    } catch (error) {
      console.error(formatConsoleMessage('StorageWorker', 'Error migrating storage: '), error);
    }
  }
}
