import { MessageAction, type Message, type MessageResponse } from '../types';
import { formatConsoleMessage } from '../utils';

const INFO_TIMEOUT_MS = 5000;

export class YoutubeTwitchChatNavigationWorker {
  public channelName: string = '';
  private previousChannelName: string = '';

  constructor() {
    this.setupNavigationListener();
    console.log(formatConsoleMessage('NavigationWorker', 'Navigation Worker initialized'));
  }

  private setupNavigationListener = () => {
    // Helper type for history methods
    type HistoryMethod = 'pushState' | 'replaceState';

    // Listen for pushState and replaceState
    const _wr = (type: HistoryMethod): ((...args: any[]) => any) => {
      const orig = history[type];
      return function (this: History, ...args: any[]): any {
        const rv = (orig as any).apply(this, args);
        window.dispatchEvent(new Event('yt-navigate'));
        return rv;
      };
    };
    history.pushState = _wr('pushState');
    history.replaceState = _wr('replaceState');

    // Listen for popstate and custom navigation event
    window.addEventListener('popstate', () => this.onNavigation('popstate'));
    window.addEventListener('yt-navigate', () => this.onNavigation('yt-navigate'));

    // Initial trigger
    this.onNavigation('initial');
  };

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private onNavigation = async (eventType: string): Promise<void> => {
    await this.sleep(100); // Slight delay to allow DOM to update
    console.log(
      formatConsoleMessage(
        'NavigationWorker',
        `Navigation event detected: ${eventType}, URL: ${window.location.href}`
      )
    );

    this.channelName = '';

    if (this.previousChannelName) {
      console.log(
        formatConsoleMessage(
          'NavigationWorker',
          `Stream unloaded for channel: ${this.previousChannelName}`
        )
      );
      window.dispatchEvent(new Event('yt-twitch-chat-stream-unloaded'));
    }

    const channelName = await this.extractChannelName();

    if (channelName === '') {
      console.log(
        formatConsoleMessage(
          'NavigationWorker',
          'No channel name found, skipping further processing'
        )
      );
      return;
    }
    this.previousChannelName = channelName;
    const isLive = await this.isLiveStream();
    if (!isLive) {
      console.log(formatConsoleMessage('NavigationWorker', 'Not a live stream'));
      return;
    }
    this.channelName = channelName;
    const message: Message<MessageAction.SET_CURRENT_CHANNEL> = {
      action: MessageAction.SET_CURRENT_CHANNEL,
      data: { channelName: this.channelName }
    };

    const response = await chrome.runtime.sendMessage<
      Message<MessageAction.SET_CURRENT_CHANNEL>,
      MessageResponse<MessageAction.SET_CURRENT_CHANNEL>
    >(message);

    if (!response || !response.success) {
      console.error(
        formatConsoleMessage(
          'NavigationWorker',
          'Failed to set current channel in background script'
        )
      );
      return;
    }
    console.log(
      formatConsoleMessage('NavigationWorker', `Stream loaded for channel: ${this.channelName}`)
    );
    window.dispatchEvent(
      new CustomEvent('yt-twitch-chat-stream-loaded', { detail: { channelName: this.channelName } })
    );
  };

  private async extractChannelName(): Promise<string> {
    // Only extract channel names on video/live stream pages
    if (!window.location.href.includes('/watch')) {
      return '';
    }

    // Try multiple methods to get channel name
    let channelName = await this.getChannelFromOwnerLink();

    // Clean up the channel name
    if (channelName === '') {
      return channelName;
    }

    if (channelName === this.previousChannelName) {
      console.log(
        formatConsoleMessage(
          'NavigationWorker',
          `Channel name ${channelName} is the same as previous channel, validating...`
        )
      );
      channelName = await this.validateRepeatChannelNameExtraction(channelName);
      if (channelName === this.previousChannelName) {
        console.log(
          formatConsoleMessage(
            'NavigationWorker',
            `Channel name ${channelName} confirmed as previous channel after validation`
          )
        );
      } else {
        console.log(
          formatConsoleMessage(
            'NavigationWorker',
            `Channel name changed to ${channelName} after validation`
          )
        );
      }
    }

    return channelName;
  }

  private getChannelFromOwnerLink(): Promise<string> {
    return new Promise((resolve) => {
      const intervalId = setInterval(() => {
        const ownerDiv = document.querySelector('#owner');
        let ownerLink: HTMLAnchorElement | null = null;
        if (!ownerDiv) {
          return;
        }
        ownerLink = ownerDiv.querySelector('a[href*="/@"]') as HTMLAnchorElement;
        if (!ownerLink) {
          return;
        }
        const href = ownerLink.href;
        const match = href.match(/\/@([^/?]+)/);
        if (!match) {
          return;
        }
        let channelName = match[1];
        console.log(
          formatConsoleMessage('NavigationWorker', 'Found channel via owner div @link:'),
          channelName
        );
        channelName = decodeURIComponent(channelName);
        channelName = channelName.split('?')[0].split('#')[0];
        console.log(
          formatConsoleMessage('NavigationWorker', 'yt-twitch-chat: Final cleaned channel name:'),
          channelName
        );
        resolve(channelName);
        clearInterval(intervalId);
      }, 500);

      setTimeout(() => {
        clearInterval(intervalId);
        resolve('');
      }, INFO_TIMEOUT_MS);
    });
  }

  private validateRepeatChannelNameExtraction = (channelName: string): Promise<string> => {
    return new Promise((resolve) => {
      const intervalId = setInterval(async () => {
        const newChannelName = await this.getChannelFromOwnerLink();
        if (newChannelName === channelName) {
          return;
        }
        resolve(newChannelName);
        clearInterval(intervalId);
      }, 500);
      setTimeout(() => {
        resolve(channelName);
        clearInterval(intervalId);
      }, INFO_TIMEOUT_MS);
    });
  };

  private isLiveStream(): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      const intervalId = setInterval(() => {
        const chatFrame = document.querySelector('#chatframe');
        if (!chatFrame) {
          return;
        }
        clearInterval(intervalId);
        resolve(true);
      }, 500);
      setTimeout(() => {
        clearInterval(intervalId);
        resolve(false);
      }, INFO_TIMEOUT_MS);
    });
  }
}
