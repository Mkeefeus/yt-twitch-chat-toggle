import type { ChannelSettings, ExtensionSettings, Theme } from '../types';
import type { YoutubeTwitchChatStorageWorker } from './storage';
import type { YoutubeTwitchChatThemeWorker } from './theme';
import { YoutubeTwitchChatPromptWorker } from './prompt';

export class YoutubeTwitchChatChatWorker {
  private channelName: string;
  private channelSettings?: ChannelSettings;
  private storageWorker: YoutubeTwitchChatStorageWorker;
  private themeWorker: YoutubeTwitchChatThemeWorker;
  private promptWorker: YoutubeTwitchChatPromptWorker;
  private youtubeiFrame?: HTMLIFrameElement;
  private twitchIframe?: HTMLIFrameElement;
  // Listener references for cleanup
  private storageChangeListener?: (
    changes: {
      [key: string]: chrome.storage.StorageChange;
    },
    areaName: string
  ) => void;
  private chatToggleHandler?: (event: Event) => void;
  private themeChangeHandler?: (theme: Theme) => void;
  // DOM tracking for cleanup
  private chatContainer?: HTMLElement | null;
  private chatContainerOriginalPosition?: string;

  constructor(
    storageWorker: YoutubeTwitchChatStorageWorker,
    themeWorker: YoutubeTwitchChatThemeWorker,
    channelName: string
  ) {
    this.storageWorker = storageWorker;
    this.themeWorker = themeWorker;
    this.channelName = channelName;
    this.promptWorker = new YoutubeTwitchChatPromptWorker(storageWorker, channelName);
    this.init();
  }

  private async init() {
    this.setupEventListeners();
    this.findYouTubeChat();
    this.channelSettings = await this.storageWorker.getChannelSettings(this.channelName);
    if (!this.channelSettings) {
      const twitchChannel = await this.promptWorker.showPrompt();
      if (twitchChannel) {
        this.channelSettings = {
          twitchChannel,
          preferredChat: 'twitch'
        };
      }
    }
    this.updateChatVisibility();
  }

  private updateChatVisibility() {
    if (!this.channelSettings || !this.youtubeiFrame) return;
    const preferredChat = this.channelSettings.preferredChat || 'youtube';
    const showTwitch = preferredChat === 'twitch';

    if (this.channelSettings.twitchChannel && !this.twitchIframe) {
      this.createTwitchChat();
    }

    if (showTwitch) {
      this.hideiFrame(this.youtubeiFrame);

      if (this.twitchIframe) {
        this.showiFrame(this.twitchIframe);
      }
    } else {
      this.showiFrame(this.youtubeiFrame);

      if (this.twitchIframe) {
        this.hideiFrame(this.twitchIframe);
      }
    }
  }

  private createTwitchChat() {
    if (!this.youtubeiFrame || !this.channelSettings?.twitchChannel || this.twitchIframe) return;

    this.getChatContainer();
    if (!this.chatContainer) return;

    // Track original inline style to restore later
    this.chatContainerOriginalPosition = this.chatContainer.style.position;
    if (getComputedStyle(this.chatContainer).position === 'static') {
      this.chatContainer.style.position = 'relative';
    }

    this.twitchIframe = document.createElement('iframe');
    this.twitchIframe.id = `twitch-chat-iframe-${this.channelName}`;
    this.twitchIframe.src = this.getTwitchChatUrl(
      this.channelSettings.twitchChannel,
      this.themeWorker.theme
    );
    this.twitchIframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    this.twitchIframe.className = 'ytd-live-chat-frame';

    this.twitchIframe.style.transition = 'opacity 0.3s ease-in-out';
    this.hideiFrame(this.twitchIframe);

    this.chatContainer.appendChild(this.twitchIframe);
    this.themeChangeHandler = (theme: 'light' | 'dark') => {
      if (this.twitchIframe && this.channelSettings?.twitchChannel) {
        this.twitchIframe.src = this.getTwitchChatUrl(this.channelSettings.twitchChannel, theme);
      }
    };
    this.themeWorker.onThemeChange(this.themeChangeHandler);
  }

  private showiFrame(iframe: HTMLIFrameElement) {
    iframe.style.opacity = '1';
    iframe.style.pointerEvents = 'auto';
    iframe.style.position = 'static';
    iframe.style.visibility = 'visible';
  }

  private hideiFrame(iframe: HTMLIFrameElement) {
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.position = 'absolute';
    iframe.style.visibility = 'hidden';
  }

  private setupEventListeners() {
    // Listen for storage changes
    this.storageChangeListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      _areaName: string
    ) => {
      const { newValue, oldValue }: { newValue?: ExtensionSettings; oldValue?: ExtensionSettings } =
        changes.yt_twitch_chat_settings;
      if (!newValue || !oldValue) return;
      if (newValue.channels[this.channelName] === oldValue.channels[this.channelName]) {
        return;
      }
      this.channelSettings = newValue.channels[this.channelName];
      this.updateChatVisibility();
    };

    // Listen for toggle events
    this.chatToggleHandler = (ev: Event) => {
      const event = ev as CustomEvent;
      const { preferredChat } = event.detail ?? {};
      if (preferredChat && this.channelSettings) {
        this.channelSettings.preferredChat = preferredChat;
        this.updateChatVisibility();
      }
    };

    chrome.storage.onChanged.addListener(this.storageChangeListener);
    window.addEventListener('chatToggleChanged', this.chatToggleHandler as EventListener);
  }

  private getChatContainer(): void {
    if (!this.youtubeiFrame) {
      this.findYouTubeChat();
    }
    if (!this.youtubeiFrame) return;
    const chatContainer = this.youtubeiFrame.parentElement as HTMLElement | null;
    if (!chatContainer) return;
    this.chatContainer = chatContainer;

    // Track original inline style to restore later
    this.chatContainerOriginalPosition = chatContainer.style.position;
    if (getComputedStyle(chatContainer).position === 'static') {
      chatContainer.style.position = 'relative';
    }
    this.chatContainer = chatContainer;
  }

  private getTwitchChatUrl(twitchChannel: string, theme: 'light' | 'dark'): string {
    return `https://www.twitch.tv/embed/${twitchChannel}/chat?parent=www.youtube.com${theme === 'dark' ? '&darkpopout' : ''}`;
  }

  private findYouTubeChat() {
    if (this.youtubeiFrame) return;
    const ytIframe = document.getElementById('chatframe') as HTMLIFrameElement;
    if (ytIframe) {
      this.youtubeiFrame = ytIframe;
      this.youtubeiFrame.style.transition = 'opacity 0.3s ease-in-out';
      this.updateChatVisibility();
    }
  }

  private removeTwitchChat() {
    if (this.twitchIframe) {
      this.twitchIframe.remove();
      this.twitchIframe = undefined;
    }
  }

  public destroy() {
    // Remove event listeners
    if (this.storageChangeListener) {
      chrome.storage.onChanged.removeListener(this.storageChangeListener);
      this.storageChangeListener = undefined;
    }
    if (this.chatToggleHandler) {
      window.removeEventListener('chatToggleChanged', this.chatToggleHandler as EventListener);
      this.chatToggleHandler = undefined;
    }

    // Unregister theme listener if available
    if (this.themeChangeHandler) {
      // New API on theme worker to support cleanup
      this.themeWorker.unregisterThemeChangeListener(this.themeChangeHandler);
      this.themeChangeHandler = undefined;
    }

    // Remove Twitch chat iframe
    this.removeTwitchChat();

    // Restore YouTube chat iframe visibility/styles
    if (this.youtubeiFrame) {
      this.youtubeiFrame.style.opacity = '';
      this.youtubeiFrame.style.pointerEvents = '';
      this.youtubeiFrame.style.position = '';
      this.youtubeiFrame.style.visibility = '';
      this.youtubeiFrame.style.transition = '';
    }

    // Restore chat container styles
    if (this.chatContainer) {
      if (this.chatContainerOriginalPosition !== undefined) {
        this.chatContainer.style.position = this.chatContainerOriginalPosition;
      }
      this.chatContainer = null;
      this.chatContainerOriginalPosition = undefined;
    }

    // Destroy prompt worker
    this.promptWorker.destroy();

    // Clear references
    this.youtubeiFrame = undefined;
  }
}
