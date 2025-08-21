import { formatConsoleMessage } from '../helpers';
import type { ExtensionSettings, MessageRequest, MessageResponse } from '../types';

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

      const defaultSettings: ExtensionSettings = {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        theme: 'system', // Default to system theme
        storageMode: 'local' // Default to local storage
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
        case 'switchStorageType':
          console.log(
            formatConsoleMessage(
              'StorageWorker',
              `Received request to switch storage type from: ${_sender.tab?.url || 'popup'}`
            )
          );
          sendResponse({ success: true });
          break;

        case 'getSettings':
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

  private setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (changes[this.STORAGE_KEY]?.newValue?.lastUpdated) {
        return; // Ignore changes to lastUpdated
      }
      if (area === 'local' || area === 'sync') {
        console.log(
          formatConsoleMessage(
            'StorageWorker',
            `Storage changed in ${area}: ${JSON.stringify(changes)}`
          )
        );
      }
      this.storage?.set({ [this.STORAGE_KEY]: { lastUpdated: Date.now() } });
    });
  }

  private async handleGetSettings(): Promise<ExtensionSettings | undefined> {
    const settings = await this.storage?.get([this.STORAGE_KEY]);
    if (!settings || !settings[this.STORAGE_KEY]) {
      console.warn(formatConsoleMessage('StorageWorker', 'No settings found'));
      return;
    }
    return settings[this.STORAGE_KEY] as ExtensionSettings;
  }
}
