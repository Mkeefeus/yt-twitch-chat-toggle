import { formatConsoleMessage } from '../helpers';

const MAX_ATTEMPTS = 5;
const CHATFRAME_TIMEOUT_MS = 10000; // Time to wait for chat frame to appear

export class YoutubeTwitchChatNavigationWorker {

  private onStreamLoadedCallbacks: Array<() => void> = [];
  private onStreamUnloadedCallbacks: Array<() => void> = [];
  private channelName: string = '';
  private liveStreamLoaded: boolean = false;

  constructor() {
    this.setupNavigationListener();
    console.log(formatConsoleMessage('NavigationWorker', 'Navigation Worker initialized'));
  }

  private extractChannelName(): string {
    // Only extract channel names on video/live stream pages
    if (!window.location.href.includes('/watch')) {
      return '';
    }

    // Try multiple methods to get channel name
    let channelName = '';

    // Method 1: From div#owner > a tag with @link (most reliable)
    const ownerDiv = document.querySelector('#owner');
    if (ownerDiv) {
      const ownerLink = ownerDiv.querySelector('a[href*="/@"]') as HTMLAnchorElement;
      if (ownerLink) {
        const href = ownerLink.href;
        const match = href.match(/\/@([^/?]+)/);
        if (match) {
          channelName = match[1];
          console.log('yt-twitch-chat: Found channel via owner div @link:', channelName);
        }
      }
    }

    // Clean up the channel name
    if (channelName) {
      // Remove any URL encoding and clean up
      channelName = decodeURIComponent(channelName);
      // Remove any trailing parameters or fragments
      channelName = channelName.split('?')[0].split('#')[0];
      console.log('yt-twitch-chat: Final cleaned channel name:', channelName);
    }

    return channelName;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isLiveStream(): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      const intervalId = setInterval(() => {
        const chatFrame = document.querySelector('#chatframe');
        if (chatFrame) {
          clearInterval(intervalId);
          console.log(formatConsoleMessage('NavigationWorker', 'Live stream detected via chat frame'));
          resolve(true);
        }
      }, 500);

      await this.sleep(CHATFRAME_TIMEOUT_MS);
      clearInterval(intervalId);

      console.log(formatConsoleMessage('NavigationWorker', 'Live stream detection failed after all attempts'));
      resolve(false);
    });
  }

  private onNavigation = async (eventType: string): Promise<void> => {
    await this.sleep(100); // Slight delay to allow DOM to update
    await chrome.storage.local.remove('current_yt_channel');
    console.log(formatConsoleMessage('NavigationWorker', `Navigation event detected: ${eventType}, URL: ${window.location.href}`));

    const previousChannel = this.channelName;
    const previousLiveState = this.liveStreamLoaded;
    this.channelName = '';
    this.liveStreamLoaded = false;

    if (previousLiveState && previousChannel) {
      console.log(formatConsoleMessage('NavigationWorker', `Stream unloaded for channel: ${previousChannel}`));
      this.runOnStreamUnloadedCallbacks();
    }
    let attempt = 0;
    while (attempt < MAX_ATTEMPTS) {
      this.channelName = this.extractChannelName();
      if (this.channelName !== '') {
        break;
      }
      attempt++;
      await this.sleep(500);
    }
    if (this.channelName === '') {
      console.log(formatConsoleMessage('NavigationWorker', 'No channel name found, skipping further processing'));
      return;
    }
    const isLive = await this.isLiveStream();
    console.log(formatConsoleMessage('NavigationWorker', `Is live stream: ${isLive}`));
    if (!isLive) {
      console.log(formatConsoleMessage('NavigationWorker', 'Not a live stream, skipping channel storage'));
      return;
    }
    await chrome.storage.local.set({ current_yt_channel: this.channelName });
    this.liveStreamLoaded = true;
    this.runOnStreamLoadedCallbacks();
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
  }

  private runOnStreamLoadedCallbacks() {
    for (const callback of this.onStreamLoadedCallbacks) {
      callback();
    }
  }

  private runOnStreamUnloadedCallbacks() {
    for (const callback of this.onStreamUnloadedCallbacks) {
      callback();
    }
  }

  public onStreamLoaded(callback: () => void) {
    this.onStreamLoadedCallbacks.push(callback);
  }

  public onStreamUnloaded(callback: () => void) {
    this.onStreamUnloadedCallbacks.push(callback);
  }

}
