import type { YoutubeTwitchChatStorageWorker } from './storage';
import '../styles/prompt.css';

export class YoutubeTwitchChatPromptWorker {
  private storageWorker: YoutubeTwitchChatStorageWorker;
  private channelName: string;
  private promptContainer?: HTMLElement;

  constructor(storageWorker: YoutubeTwitchChatStorageWorker, channelName: string) {
    this.storageWorker = storageWorker;
    this.channelName = channelName;
  }

  public async showPrompt(): Promise<string | null> {
    return new Promise((resolve) => {
      this.createPromptOverlay(resolve);
    });
  }

  private createPromptOverlay(resolve: (value: string | null) => void) {
    // Find the chat container like in chat.ts
    const chatContainer = this.getChatContainer();
    if (!chatContainer) {
      console.warn('Chat container not found, cannot show prompt');
      resolve(null);
      return;
    }

    // Create overlay that covers the chat area
    const overlay = document.createElement('div');
    overlay.className = `yt-twitch-prompt-chat-overlay`;

    // Create prompt container
    const promptContainer = document.createElement('div');
    promptContainer.className = 'yt-twitch-prompt-container';

    // Create content
    const title = document.createElement('h3');
    title.textContent = `Link Twitch Chat: ${this.channelName}`;
    title.className = 'yt-twitch-prompt-title';

    const description = document.createElement('p');
    description.textContent =
      'Enter the Twitch channel name to show Twitch chat alongside YouTube chat for this channel.';
    description.className = 'yt-twitch-prompt-description';

    // Add link emoji above input
    const linkEmoji = document.createElement('div');
    linkEmoji.textContent = '🔗';
    linkEmoji.className = 'yt-twitch-prompt-emoji';

    // Create input container with autodetect button
    const inputContainer = document.createElement('div');
    inputContainer.className = 'yt-twitch-prompt-input-container';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Twitch channel name';
    input.className = 'yt-twitch-prompt-input';

    const autodetectButton = document.createElement('button');
    autodetectButton.textContent = '🎯';
    autodetectButton.className = 'yt-twitch-prompt-button yt-twitch-prompt-button--autodetect';
    autodetectButton.title = 'Use current channel name';
    autodetectButton.type = 'button';

    inputContainer.appendChild(input);
    inputContainer.appendChild(autodetectButton);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'yt-twitch-prompt-button-container';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'yt-twitch-prompt-button yt-twitch-prompt-button--cancel';

    const keepYouTubeButton = document.createElement('button');
    keepYouTubeButton.textContent = 'Keep YouTube Chat';
    keepYouTubeButton.className = 'yt-twitch-prompt-button yt-twitch-prompt-button--keep-youtube';

    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'yt-twitch-prompt-button yt-twitch-prompt-button--save';

    // Event handlers
    const handleSave = async () => {
      const twitchChannel = input.value.trim();
      if (twitchChannel) {
        if (this.channelName) {
          await this.storageWorker.updateChannelSettings(this.channelName, {
            twitchChannel,
            preferredChat: 'twitch'
          });
        }
        this.removePrompt();
        resolve(twitchChannel);
      }
    };

    const handleKeepYouTube = async () => {
      if (this.channelName) {
        // Save settings to indicate user wants to keep YouTube chat and not be prompted again
        await this.storageWorker.updateChannelSettings(this.channelName, {
          preferredChat: 'youtube'
        });
      }
      this.removePrompt();
      resolve('youtube-only');
    };

    const handleCancel = () => {
      this.removePrompt();
      resolve(null);
    };

    // Add event listeners
    autodetectButton.addEventListener('click', () => {
      input.value = this.channelName;
      input.dispatchEvent(new Event('input')); // Trigger input event to enable save button
      input.focus();
    });

    saveButton.addEventListener('click', handleSave);
    keepYouTubeButton.addEventListener('click', handleKeepYouTube);
    cancelButton.addEventListener('click', handleCancel);

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    });

    // Enable/disable save button based on input
    input.addEventListener('input', () => {
      const hasValue = input.value.trim().length > 0;
      saveButton.disabled = !hasValue;
    });

    // Close on overlay click (but not on prompt container click)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        handleCancel();
      }
    });

    // Assemble the prompt
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(keepYouTubeButton);
    buttonContainer.appendChild(saveButton);

    promptContainer.appendChild(title);
    promptContainer.appendChild(linkEmoji);
    promptContainer.appendChild(description);
    promptContainer.appendChild(inputContainer);
    promptContainer.appendChild(buttonContainer);

    overlay.appendChild(promptContainer);
    chatContainer.appendChild(overlay);

    this.promptContainer = overlay;

    // Focus the input and set initial save button state
    setTimeout(() => {
      input.focus();
      saveButton.disabled = true;
    }, 100);
  }

  private getChatContainer(): HTMLElement | null {
    // Use the same logic as in chat.ts to find the chat container
    const ytIframe = document.getElementById('chatframe') as HTMLIFrameElement;
    if (!ytIframe) return null;

    const chatContainer = ytIframe.parentElement as HTMLElement | null;
    if (!chatContainer) return null;

    // Ensure the container has relative positioning for absolute overlay
    const computedStyle = getComputedStyle(chatContainer);
    if (computedStyle.position === 'static') {
      chatContainer.style.position = 'relative';
    }

    return chatContainer;
  }

  private removePrompt() {
    if (this.promptContainer) {
      this.promptContainer.remove();
      this.promptContainer = undefined;
    }
  }

  public destroy() {
    this.removePrompt();
  }
}
