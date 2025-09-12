import type { ChannelSettings } from '../types';
import type { YoutubeTwitchChatStorageWorker } from './storage';
import type { YoutubeTwitchChatThemeWorker } from './theme';

export class YoutubeTwitchChatChatWorker {
  private youtubeiFrame?: HTMLIFrameElement;
  private channelSettings?: ChannelSettings;
  private storageWorker: YoutubeTwitchChatStorageWorker;
  private themeWorker: YoutubeTwitchChatThemeWorker;
  private twitchIframe?: HTMLIFrameElement;

  constructor(storageWorker: YoutubeTwitchChatStorageWorker, themeWorker: YoutubeTwitchChatThemeWorker) {
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
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.current_yt_channel || changes.yt_twitch_chat_settings) {
        this.loadInitialState();
      }
    };

    // Listen for toggle events
    const handleChatToggle = (event: CustomEvent) => {
      const { preferredChat } = event.detail;
      if (this.channelSettings) {
        this.channelSettings.preferredChat = preferredChat;
        this.updateChatVisibility();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    window.addEventListener('chatToggleChanged', handleChatToggle as EventListener);
  }

  private findYouTubeChat() {
    const ytIframe = document.getElementById('chatframe') as HTMLIFrameElement;
    if (ytIframe) {
      this.youtubeiFrame = ytIframe;
      this.setupYouTubeIframeStyles();
      this.updateChatVisibility();
    }
  }

  private setupYouTubeIframeStyles() {
    if (!this.youtubeiFrame) return;
    this.youtubeiFrame.style.transition = 'opacity 0.3s ease-in-out';
  }

  private setupTwitchIframeStyles() {
    if (!this.twitchIframe) return;
    this.twitchIframe.style.transition = 'opacity 0.3s ease-in-out';
    this.twitchIframe.style.position = 'absolute';
  }

  private updateChatVisibility() {
    if (!this.channelSettings || !this.youtubeiFrame) return;
    const preferredChat = this.channelSettings.preferredChat || 'youtube';
    const showTwitch = preferredChat === 'twitch';

    if (this.channelSettings.twitchChannel && !this.twitchIframe) {
      this.createTwitchChat();
    }

    if (showTwitch) {
      this.youtubeiFrame.style.opacity = '0';
      this.youtubeiFrame.style.pointerEvents = 'none';
      this.youtubeiFrame.style.position = 'absolute';
      this.youtubeiFrame.style.visibility = 'hidden';

      if (this.twitchIframe) {
        this.twitchIframe.style.opacity = '1';
        this.twitchIframe.style.pointerEvents = 'auto';
        this.twitchIframe.style.position = 'static';
        this.twitchIframe.style.visibility = 'visible';
      }
    } else {
      this.youtubeiFrame.style.opacity = '1';
      this.youtubeiFrame.style.pointerEvents = 'auto';
      this.youtubeiFrame.style.position = 'static';
      this.youtubeiFrame.style.visibility = 'visible';

      if (this.twitchIframe) {
        this.twitchIframe.style.opacity = '0';
        this.twitchIframe.style.pointerEvents = 'none';
        this.twitchIframe.style.position = 'absolute';
        this.twitchIframe.style.visibility = 'hidden';
      }
    }
  }

  private getTwitchChatUrl(twitchChannel: string, theme: 'light' | 'dark'): string {
    return `https://www.twitch.tv/embed/${twitchChannel}/chat?parent=www.youtube.com${theme === 'dark' ? '&darkpopout' : ''}`;
  }

  private createTwitchChat() {
    if (!this.youtubeiFrame || !this.channelSettings?.twitchChannel || this.twitchIframe) return;

    const chatContainer = this.youtubeiFrame.parentElement;
    if (!chatContainer) return;

    if (getComputedStyle(chatContainer).position === 'static') {
      chatContainer.style.position = 'relative';
    }

    this.twitchIframe = document.createElement('iframe');
    this.twitchIframe.id = 'twitch-chat-iframe';
    this.twitchIframe.src = this.getTwitchChatUrl(this.channelSettings.twitchChannel, this.themeWorker.theme);
    this.twitchIframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    this.twitchIframe.className = 'ytd-live-chat-frame';

    this.setupTwitchIframeStyles();
    this.twitchIframe.style.opacity = '0';
    this.twitchIframe.style.pointerEvents = 'none';
    this.twitchIframe.style.position = 'absolute';
    this.twitchIframe.style.visibility = 'hidden';

    chatContainer.appendChild(this.twitchIframe);
    this.themeWorker.registerThemeChangeListener((theme: 'light' | 'dark') => {
      if (this.twitchIframe && this.channelSettings?.twitchChannel) {
        this.twitchIframe.src = this.getTwitchChatUrl(this.channelSettings.twitchChannel, theme);
      }
    });
  }

  private removeTwitchChat() {
    if (this.twitchIframe) {
      this.twitchIframe.remove();
      this.twitchIframe = undefined;
    }
  }

  public destroy() {
    this.removeTwitchChat();
  }
}
