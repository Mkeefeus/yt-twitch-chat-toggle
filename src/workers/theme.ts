import { formatConsoleMessage } from '../utils';
import { MessageAction, type SystemTheme, type Theme } from '../types';
import type { YoutubeTwitchChatStorageWorker } from './storage';

export class YoutubeTwitchChatThemeWorker {
  public theme: Theme = 'dark';
  private systemTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  private themeSetting: SystemTheme = 'system';
  private storageWorker: YoutubeTwitchChatStorageWorker;
  private listeners: ((theme: Theme) => void)[] = [];
  private mediaQueryList?: MediaQueryList;
  private storageChangeListener?: (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => void;
  constructor(storageWorker: YoutubeTwitchChatStorageWorker) {
    this.storageWorker = storageWorker;
    this.init();
  }
  private init() {
    this.setupEventListeners();
    this.loadInitialState();
  }

  private setupEventListeners() {
    this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQueryList.addEventListener('change', this.reinitialize);
    this.storageChangeListener = (changes) => {
      if (!changes.yt_twitch_chat_settings) {
        return;
      }
      if (
        changes.yt_twitch_chat_settings.newValue.theme ===
        changes.yt_twitch_chat_settings.oldValue.theme
      ) {
        return;
      }
      console.log(formatConsoleMessage('ThemeWorker', 'Detected theme change in storage'));
      this.reinitialize();
    };
    chrome.storage.onChanged.addListener(this.storageChangeListener);
  }

  private reinitialize = async () => {
    // Refresh system theme for 'system' mode changes
    this.systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const oldTheme = this.theme;
    await this.loadInitialState();
    if (this.theme === oldTheme) {
      return;
    }
    console.log(
      formatConsoleMessage('ThemeWorker', `Theme updated to ${this.theme} due to settings change`)
    );
    this.runThemeChangeListeners();
    chrome.runtime.sendMessage({ action: MessageAction.THEME_CHANGED, theme: this.theme });
  };

  private async loadInitialState() {
    const settings = await this.storageWorker.getSettings();
    if (!settings) {
      console.error(formatConsoleMessage('ThemeWorker', 'failed to get extension settings'));
      return;
    }
    this.themeSetting = settings.theme;
    this.setThemeFromSettings();
    console.log(
      formatConsoleMessage(
        'ThemeWorker',
        `Initialized with theme setting: ${this.themeSetting}, system theme: ${this.systemTheme}, resulting theme: ${this.theme}`
      )
    );
  }

  private setThemeFromSettings() {
    if (this.themeSetting === 'system') {
      this.theme = this.systemTheme;
    } else {
      this.theme = this.themeSetting;
    }
    console.log(
      formatConsoleMessage(
        'ThemeWorker',
        `Theme set to ${this.theme} based on setting ${this.themeSetting}`
      )
    );
  }

  public onThemeChange(callback: (theme: Theme) => Promise<void> | void) {
    // when this.theme changes, run callback
    this.listeners.push(callback);
  }

  public unregisterThemeChangeListener(callback: (theme: Theme) => Promise<void> | void) {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  private runThemeChangeListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.theme);
      } catch (error) {
        console.error(
          formatConsoleMessage('ThemeWorker', `Error in theme change listener: ${error}`)
        );
      }
    });
  }

  public destroy() {
    if (this.mediaQueryList) {
      this.mediaQueryList.removeEventListener('change', this.reinitialize);
      this.mediaQueryList = undefined;
    }
    if (this.storageChangeListener) {
      chrome.storage.onChanged.removeListener(this.storageChangeListener);
      this.storageChangeListener = undefined;
    }

    this.listeners = [];
  }
}
