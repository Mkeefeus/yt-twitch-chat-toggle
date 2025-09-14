import { formatConsoleMessage } from '../helpers';
import type { YoutubeTwitchChatStorageWorker } from './storage';

export class YoutubeTwitchChatThemeWorker {
  public theme: 'light' | 'dark' = 'dark';
  private systemTheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
  private themeSetting: 'light' | 'dark' | 'system' = 'system';
  private storageWorker: YoutubeTwitchChatStorageWorker;
  private listeners: ((theme: 'light' | 'dark') => void)[] = [];
  constructor(storageWorker: YoutubeTwitchChatStorageWorker) {
    this.storageWorker = storageWorker;
    this.init();
  }
  private init() {
    this.setupEventListeners();
    this.loadInitialState();
  }

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

  private reinitialize = async () => {
    const oldTheme = this.theme;
    await this.loadInitialState();
    if (this.theme === oldTheme) {
      return;
    }
    console.log(
      formatConsoleMessage('ThemeWorker', `Theme updated to ${this.theme} due to settings change`)
    );
    this.runThemeChangeListeners();
  };

  private setupEventListeners() {
    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryList.addEventListener('change', this.reinitialize);
    chrome.storage.onChanged.addListener((changes) => {
      if (!changes.yt_twitch_chat_settings) {
        return;
      }
      console.log(formatConsoleMessage('ThemeWorker', 'Detected settings change in storage'));
      this.reinitialize();
    });
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
  public registerThemeChangeListener(callback: (theme: 'light' | 'dark') => Promise<void> | void) {
    // when this.theme changes, run callback
    this.listeners.push(callback);
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
}
