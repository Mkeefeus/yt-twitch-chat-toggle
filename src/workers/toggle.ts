import { formatConsoleMessage } from '../helpers';
import type { YoutubeTwitchChatStorageWorker } from './storage';

export class YoutubeTwitchChatToggleWorker {
  private preferredChat: 'youtube' | 'twitch' = 'youtube';
  private storageWorker: YoutubeTwitchChatStorageWorker;
  private container: HTMLElement;
  private channelName: string;
  // Listener refs for cleanup
  private storageChangeListener?: (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => void;
  private clickHandler?: (ev: Event) => void;

  constructor(storageWorker: YoutubeTwitchChatStorageWorker, channelName: string) {
    this.storageWorker = storageWorker;
    this.container = this.createContainer();
    this.channelName = channelName;
    this.init();
  }

  private createContainer(): HTMLElement {
    const controls = document.querySelector<HTMLElement>('.ytp-left-controls');
    if (!controls) {
      throw new Error('YouTube player controls not found');
    }

    // Prevent duplicate injection
    const existing = controls.querySelector('.yt-chat-toggle-container');
    if (existing) {
      console.log(formatConsoleMessage('ToggleWorker', 'Toggle already exists, removing old one'));
      existing.remove();
    }

    const container = document.createElement('div');
    container.className = `yt-chat-toggle-container ytp-button`;
    container.title = 'Swap chat';
    container.setAttribute('data-title-no-tooltip', 'Swap chat');
    container.setAttribute('aria-label', 'Swap chat');
    container.setAttribute('data-tooltip-title', 'Swap chat');
    container.ariaLabel = 'Swap chat';

    controls.appendChild(container);
    return container;
  }

  private async init() {
    this.render();
    await this.loadInitialState();
    this.setupEventListeners();
  }

  private render() {
    this.container.innerHTML = `
      <div class="chat-toggle-wrapper" style="
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div class="youtube-icon-${this.channelName}" style="
          position: absolute;
          transition: all 0.3s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </div>
        <div class="twitch-icon-${this.channelName}" style="
          position: absolute;
          transition: all 0.3s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
          </svg>
        </div>
      </div>
    `;

    this.updateIcons();
  }

  private async loadInitialState() {
    const settings = await this.storageWorker.getChannelSettings(this.channelName);
    if (!settings?.preferredChat) return;

    console.log(formatConsoleMessage('ToggleWorker', 'Loaded settings from storage:'), settings);
    this.preferredChat = settings.preferredChat;
    this.updateIcons();
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
    chrome.storage.onChanged.addListener(this.storageChangeListener);

    // Click handler
    this.clickHandler = this.handleToggle.bind(this);
    this.container.addEventListener('click', this.clickHandler);
  }

  private async handleToggle() {
    const newChat = this.preferredChat === 'youtube' ? 'twitch' : 'youtube';
    this.preferredChat = newChat;
    this.updateIcons();

    await this.storageWorker.updateChannelSettings(this.channelName, {
      preferredChat: newChat
    });

    // Dispatch custom event for immediate updates
    window.dispatchEvent(
      new CustomEvent('chatToggleChanged', {
        detail: { preferredChat: newChat }
      })
    );
  }

  private updateIcons() {
    const youtubeIcon = this.container.querySelector(
      `.youtube-icon-${this.channelName}`
    ) as HTMLElement;
    const twitchIcon = this.container.querySelector(
      `.twitch-icon-${this.channelName}`
    ) as HTMLElement;

    if (youtubeIcon) {
      youtubeIcon.style.opacity = this.preferredChat === 'youtube' ? '1' : '0';
      youtubeIcon.style.transform =
        this.preferredChat === 'youtube' ? 'scale(1) rotate(0deg)' : 'scale(0.75) rotate(45deg)';
    }

    if (twitchIcon) {
      twitchIcon.style.opacity = this.preferredChat === 'twitch' ? '1' : '0';
      twitchIcon.style.transform =
        this.preferredChat === 'twitch' ? 'scale(1) rotate(0deg)' : 'scale(0.75) rotate(-45deg)';
    }
  }

  public destroy() {
    // Remove event listeners
    if (this.clickHandler) {
      this.container.removeEventListener('click', this.clickHandler);
      this.clickHandler = undefined;
    }
    if (this.storageChangeListener) {
      chrome.storage.onChanged.removeListener(this.storageChangeListener);
      this.storageChangeListener = undefined;
    }

    // Remove DOM node we injected
    this.container.remove();
  }
}
