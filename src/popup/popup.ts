import { YoutubeTwitchChatStorageWorker } from '../workers/storage';

class YoutubeTwitchChatPopup {
  private storageWorker: YoutubeTwitchChatStorageWorker;
  constructor() {
    this.storageWorker = new YoutubeTwitchChatStorageWorker();
    this.init();
  }
  private init() {
    this.setupEventListeners();
    this.checkValidSite();
    this.loadSettings();
  }
  private async setupEventListeners() {
    /* Navigation Buttons */
    /* Uncomment if settings list is to long for main page */
    /*
    const goToSettingsBtn = document.getElementById('go-to-settings');
    const backToMainBtn = document.getElementById('back-to-main');
    if (!goToSettingsBtn || !backToMainBtn) {
      throw new Error('Navigation buttons not found in popup');
    }
    goToSettingsBtn.addEventListener('click', () => {
      this.showPage('settings-page');
    });
    backToMainBtn.addEventListener('click', () => {
      this.showPage('main-page');
    });
    */

    /* Autodetect Button */
    const channelInput = document.getElementById('channel-input') as HTMLInputElement;
    const autodetectBtn = document.getElementById('autodetect-channel');
    if (!channelInput) {
      throw new Error('Channel input element not found in popup');
    }
    if (!autodetectBtn) {
      throw new Error('Autodetect button not found in popup');
    }
    autodetectBtn.addEventListener('click', async () => {
      channelInput.value = (await this.storageWorker.getCurrentChannel()) || '';
    });

    /* Save Button */
    const saveChannelBtn = document.getElementById('save-channel');
    const clearChannelBtn = document.getElementById('clear-channel');
    const currentChannel = await this.storageWorker.getCurrentChannel();
    if (!saveChannelBtn) {
      throw new Error('Save channel button not found in popup');
    }
    if (!clearChannelBtn) {
      throw new Error('Clear channel button not found in popup');
    }
    saveChannelBtn.addEventListener('click', async () => {
      if (!currentChannel) {
        throw new Error('No current channel detected, cannot save settings');
      }
      const channel = channelInput.value.trim();
      if (!channel) {
        this.displayChannelChangeMessage('Please enter a valid channel name', true);
        return;
      }
      await this.storageWorker.updateChannelSettings(currentChannel, {
        twitchChannel: channel,
        preferredChat: 'twitch'
      });
      clearChannelBtn.style.display = 'block';
      this.displayChannelChangeMessage('Channel saved successfully!');
    });
    clearChannelBtn.addEventListener('click', async () => {
      if (!currentChannel) {
        return;
      }
      await this.storageWorker.updateChannelSettings(currentChannel, {
        twitchChannel: '',
        preferredChat: 'youtube'
      });
      channelInput.value = '';
      clearChannelBtn.style.display = 'none';
      this.displayChannelChangeMessage('Channel cleared successfully!');
    });

    /* Settings */
    const useSyncCheckbox = document.getElementById('use-sync') as HTMLInputElement;
    if (!useSyncCheckbox) {
      throw new Error('Use sync checkbox not found in popup');
    }
    useSyncCheckbox.addEventListener('change', async () => {
      const useSync = useSyncCheckbox.checked;
      // await this.storageWorker.setSettings(settings);
      this.storageWorker.updateSettings({ useSync });
    });

    /* Theme Switcher */
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        themeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        let theme: 'light' | 'dark' | 'system' = 'system';
        if (btn.id === 'light-theme') theme = 'light';
        else if (btn.id === 'dark-theme') theme = 'dark';
        console.log('Selected theme:', theme);
        this.storageWorker.updateSettings({ theme });
      });
    });
  }

  private displayChannelChangeMessage(message: string, isError: boolean = false) {
    const changeTextElement = document.getElementById('channel-change-text');
    if (!changeTextElement) {
      throw new Error('Channel change text element not found in popup');
    }
    const newMessage = document.createElement('div');
    newMessage.textContent = message;
    newMessage.style.color = isError ? 'red' : 'green';
    changeTextElement.appendChild(newMessage);
    setTimeout(() => {
      newMessage.remove();
    }, 3000);
  }

  private showPage(pageId: string) {
    document.querySelectorAll('.page').forEach((page) => {
      (page as HTMLElement).style.display = 'none';
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.style.display = 'block';
    }
  }
  private async checkValidSite() {
    // const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // const url = tab.url || '';
    // const isValid = url.includes('youtube.com') || url.includes('twitch.tv');
    const currentChannel = await this.storageWorker.getCurrentChannel();
    if (!currentChannel) {
      this.showPage('cover-page');
    } else {
      this.showPage('main-page');
    }
  }
  private loadSettings = async () => {
    const settings = await this.storageWorker.getSettings();
    if (!settings) {
      console.error('Failed to load settings');
      return;
    }
    const channel = await this.storageWorker.getCurrentChannel();
    let channelSettings;
    if (channel) {
      channelSettings = await this.storageWorker.getChannelSettings(channel);
    }
    /* Channel Input */
    if (channelSettings && channelSettings.twitchChannel) {
      (document.getElementById('channel-input') as HTMLInputElement).value =
        channelSettings.twitchChannel;
      (document.getElementById('clear-channel') as HTMLButtonElement).style.display = 'block';
    }
    /* Settings */
    (document.getElementById('use-sync') as HTMLInputElement).checked = settings.useSync;
    /* Theme Switcher */
    const theme = settings.theme || 'system';
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach((btn) => btn.classList.remove('active'));
    if (theme === 'light') {
      document.getElementById('light-theme')?.classList.add('active');
    } else if (theme === 'dark') {
      document.getElementById('dark-theme')?.classList.add('active');
    } else {
      document.getElementById('system-theme')?.classList.add('active');
    }
  };
}

new YoutubeTwitchChatPopup();
