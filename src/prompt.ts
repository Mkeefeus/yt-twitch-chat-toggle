// Types for message communication
interface PromptResponse {
  type: 'TWITCH_CHAT_PROMPT_RESPONSE';
  action: 'connect' | 'keep_youtube';
  twitchChannel?: string;
}

class TwitchChatPrompt {
  private twitchChannelInput!: HTMLInputElement;
  private connectTwitchBtn!: HTMLButtonElement;
  private keepYouTubeBtn!: HTMLButtonElement;
  private errorDiv!: HTMLElement;

  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.focusInput();
  }

  private initializeElements(): void {
    this.twitchChannelInput = document.getElementById('twitchChannel') as HTMLInputElement;
    this.connectTwitchBtn = document.getElementById('connectTwitch') as HTMLButtonElement;
    this.keepYouTubeBtn = document.getElementById('keepYouTube') as HTMLButtonElement;
    this.errorDiv = document.getElementById('error') as HTMLElement;

    if (!this.twitchChannelInput || !this.connectTwitchBtn || !this.keepYouTubeBtn || !this.errorDiv) {
      console.error('yt-twitch-chat: Required elements not found in prompt');
      return;
    }
  }

  private setupEventListeners(): void {
    // Enable/disable connect button based on input
    this.twitchChannelInput.addEventListener('input', () => {
      const value = this.twitchChannelInput.value.trim();
      this.connectTwitchBtn.disabled = !value;

      // Hide error when typing
      if (this.errorDiv.style.display === 'block') {
        this.hideError();
      }
    });

    // Handle connect button click
    this.connectTwitchBtn.addEventListener('click', () => {
      this.handleConnectTwitch();
    });

    // Handle keep YouTube button click
    this.keepYouTubeBtn.addEventListener('click', () => {
      this.handleKeepYouTube();
    });

    // Handle Enter key in input
    this.twitchChannelInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.connectTwitchBtn.disabled) {
        this.handleConnectTwitch();
      }
    });
  }

  private handleConnectTwitch(): void {
    const channelName = this.twitchChannelInput.value.trim().toLowerCase();

    if (!channelName) {
      this.showError('Please enter a channel name');
      return;
    }

    // Basic validation for channel name
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(channelName)) {
      this.showError('Channel name can only contain letters, numbers, and underscores');
      return;
    }

    // Send message to parent window
    this.sendResponse({
      type: 'TWITCH_CHAT_PROMPT_RESPONSE',
      action: 'connect',
      twitchChannel: channelName
    });
  }

  private handleKeepYouTube(): void {
    this.sendResponse({
      type: 'TWITCH_CHAT_PROMPT_RESPONSE',
      action: 'keep_youtube'
    });
  }

  private sendResponse(response: PromptResponse): void {
    if (window.parent) {
      window.parent.postMessage(response, '*');
    } else {
      console.error('yt-twitch-chat: No parent window found to send response');
    }
  }

  private showError(message: string): void {
    this.errorDiv.textContent = message;
    this.errorDiv.style.display = 'block';
  }

  private hideError(): void {
    this.errorDiv.style.display = 'none';
  }

  private focusInput(): void {
    // Focus input on load
    if (this.twitchChannelInput) {
      this.twitchChannelInput.focus();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TwitchChatPrompt();
  });
} else {
  new TwitchChatPrompt();
}
