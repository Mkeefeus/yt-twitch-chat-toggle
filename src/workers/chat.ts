import type { ChannelSettings } from '../types';
import type { YoutubeTwitchChatStorageWorker } from './storage';
import type { YoutubeTwitchChatThemeWorker } from './theme';

export class YoutubeTwitchChatChatWorker {
  private youtubeiFrame?: HTMLIFrameElement;
  private channelSettings?: ChannelSettings;
  private storageWorker: YoutubeTwitchChatStorageWorker;
  private themeWorker: YoutubeTwitchChatThemeWorker;
  private twitchIframe?: HTMLIFrameElement;
  // Listener references for cleanup
  private storageChangeListener?: (
    changes: {
      [key: string]: chrome.storage.StorageChange;
    },
    areaName: string
  ) => void;
  private chatToggleHandler?: (event: Event) => void;
  private themeChangeHandler?: (theme: 'light' | 'dark') => void;
  // DOM tracking for cleanup
  private chatContainer?: HTMLElement | null;
  private chatContainerOriginalPosition?: string;

  constructor(
    storageWorker: YoutubeTwitchChatStorageWorker,
    themeWorker: YoutubeTwitchChatThemeWorker
  ) {
    this.storageWorker = storageWorker;
    this.themeWorker = themeWorker;
    this.init();
  }

  private async init() {
    await this.loadInitialState();
    this.setupEventListeners();
    this.findYouTubeChat();
  }

  private async loadInitialState() {
    const currentChannel = await this.storageWorker.getCurrentChannel();

    if (!currentChannel) {
      this.channelSettings = undefined;
      return;
    }

    const settings = await this.storageWorker.getChannelSettings(currentChannel);
    if (settings) {
      this.channelSettings = settings;
      this.updateChatVisibility();
    }
  }

  private setupEventListeners() {
    // Listen for storage changes
    this.storageChangeListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      _areaName: string
    ) => {
      if (changes.current_yt_channel || changes.yt_twitch_chat_settings) {
        this.loadInitialState();
      }
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

  private findYouTubeChat() {
    const ytIframe = document.getElementById('chatframe') as HTMLIFrameElement;
    if (ytIframe) {
      this.youtubeiFrame = ytIframe;
      this.youtubeiFrame.style.transition = 'opacity 0.3s ease-in-out';
      this.updateChatVisibility();
    }
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

  private getTwitchChatUrl(twitchChannel: string, theme: 'light' | 'dark'): string {
    return `https://www.twitch.tv/embed/${twitchChannel}/chat?parent=www.youtube.com${theme === 'dark' ? '&darkpopout' : ''}`;
  }

  private createTwitchChat() {
    if (!this.youtubeiFrame || !this.channelSettings?.twitchChannel || this.twitchIframe) return;

    const chatContainer = this.youtubeiFrame.parentElement as HTMLElement | null;
    if (!chatContainer) return;
    this.chatContainer = chatContainer;

    // Track original inline style to restore later
    this.chatContainerOriginalPosition = chatContainer.style.position;
    if (getComputedStyle(chatContainer).position === 'static') {
      chatContainer.style.position = 'relative';
    }

    this.twitchIframe = document.createElement('iframe');
    this.twitchIframe.id = 'twitch-chat-iframe';
    this.twitchIframe.src = this.getTwitchChatUrl(
      this.channelSettings.twitchChannel,
      this.themeWorker.theme
    );
    this.twitchIframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    this.twitchIframe.className = 'ytd-live-chat-frame';

    this.twitchIframe.style.transition = 'opacity 0.3s ease-in-out';
    this.twitchIframe.style.position = 'absolute';
    this.twitchIframe.style.opacity = '0';
    this.twitchIframe.style.pointerEvents = 'none';
    this.twitchIframe.style.position = 'absolute';
    this.twitchIframe.style.visibility = 'hidden';

    chatContainer.appendChild(this.twitchIframe);
    this.themeChangeHandler = (theme: 'light' | 'dark') => {
      if (this.twitchIframe && this.channelSettings?.twitchChannel) {
        this.twitchIframe.src = this.getTwitchChatUrl(this.channelSettings.twitchChannel, theme);
      }
    };
    this.themeWorker.onThemeChange(this.themeChangeHandler);
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

    // Clear references
    this.youtubeiFrame = undefined;
  }
}
