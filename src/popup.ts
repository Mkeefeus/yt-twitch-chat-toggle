interface ExtensionSettings {
  version: number;
  channels: Record<string, ChannelSettings>;
  lastUpdated: number;
  useSync?: boolean;
}

interface ChannelSettings {
  twitchChannel: string;
  preferredChat: 'youtube' | 'twitch';
  lastUpdated: number;
  created: number;
}

document.addEventListener('DOMContentLoaded', async function() {
  const twitchChannelInput = document.getElementById('twitchChannel') as HTMLInputElement;
  const chatToggle = document.getElementById('chatToggle') as HTMLInputElement;
  const autoFillBtn = document.getElementById('autoFillBtn') as HTMLButtonElement;
  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  const syncToggle = document.getElementById('syncToggle') as HTMLInputElement;
  const status = document.getElementById('status') as HTMLDivElement;
  const toggleGroup = document.getElementById('toggleGroup') as HTMLDivElement;
  const toggleText = document.getElementById('toggleText') as HTMLSpanElement;

  // Load current state from content script
  await loadCurrentState();

  // Helper to get current YouTube channel name from content script
  async function getCurrentYouTubeChannel(): Promise<string | null> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url?.includes('youtube.com')) {return null;}

      const response = await chrome.tabs.sendMessage(tab.id!, { action: 'getState' });
      return response?.currentYouTubeChannel !== 'unknown' ? response?.currentYouTubeChannel : null;
    } catch (error) {
      console.error('Error getting YouTube channel:', error);
      return null;
    }
  }

  // Auto-fill button functionality
  autoFillBtn.addEventListener('click', async function() {
    const youtubeChannel = await getCurrentYouTubeChannel();
    if (youtubeChannel) {
      twitchChannelInput.value = youtubeChannel.toLowerCase().replace(/\s+/g, '');
      showStatus('Auto-filled from YouTube channel', 'success');
    } else {
      showStatus('Please navigate to a YouTube page first', 'error');
    }
  });

  // Save button functionality
  saveBtn.addEventListener('click', async function() {
    const twitchChannel = twitchChannelInput.value.trim();
    const youtubeChannel = await getCurrentYouTubeChannel();
    if (!twitchChannel) {
      showStatus('Please enter a Twitch channel name', 'error');
      return;
    }
    if (!youtubeChannel) {
      showStatus('Please navigate to a YouTube page first', 'error');
      return;
    }

    // Load existing settings from appropriate storage
    const useSync = syncToggle.checked;
    const storage = useSync ? chrome.storage.sync : chrome.storage.local;
    const result = await storage.get(['yt_twitch_settings']);
    const allSettings: ExtensionSettings = result.yt_twitch_settings || {
      version: 1,
      channels: {},
      lastUpdated: Date.now(),
      useSync: useSync
    };

    allSettings.channels[youtubeChannel] = {
      twitchChannel: twitchChannel,
      preferredChat: chatToggle.checked ? 'twitch' : 'youtube',
      lastUpdated: Date.now(),
      created: allSettings.channels[youtubeChannel]?.created || Date.now()
    };
    allSettings.lastUpdated = Date.now();
    allSettings.useSync = useSync;

    await storage.set({ yt_twitch_settings: allSettings });
    showStatus('Settings saved!', 'success');
    loadCurrentState();

    // Notify content script that settings were updated
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url?.includes('youtube.com')) {
        await chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' });
      }
    } catch (error) {
      console.log('Could not notify content script:', error);
    }
  });

  // Real-time toggle functionality
  chatToggle.addEventListener('change', async function() {
    const youtubeChannel = await getCurrentYouTubeChannel();
    if (!youtubeChannel) {return;}

    // Get current storage preference
    const useSync = syncToggle.checked;
    const storage = useSync ? chrome.storage.sync : chrome.storage.local;

    // Load current settings
    const result = await storage.get(['yt_twitch_settings']);
    const allSettings: ExtensionSettings = result.yt_twitch_settings || { version: 1, channels: {}, lastUpdated: Date.now() };
    const settings = allSettings.channels[youtubeChannel] || {} as ChannelSettings;

    if (!settings.twitchChannel) {
      showStatus('Please enter and save a Twitch channel first', 'error');
      chatToggle.checked = false;
      return;
    }

    // Update settings
    settings.preferredChat = chatToggle.checked ? 'twitch' : 'youtube';
    settings.lastUpdated = Date.now();
    allSettings.channels[youtubeChannel] = settings;
    allSettings.lastUpdated = Date.now();

    await storage.set({ yt_twitch_settings: allSettings });
    toggleText.textContent = chatToggle.checked ? 'Use Twitch Chat' : 'Use YouTube Chat';
    showStatus(`Chat preference set to ${settings.preferredChat}`, 'success');

    // Update chat in content script without reload
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url?.includes('youtube.com')) {
      await chrome.tabs.sendMessage(tab.id!, {
        action: 'toggleChat',
        preferredChat: settings.preferredChat,
        twitchChannel: settings.twitchChannel
      });
    }
  });

  // Sync toggle functionality
  syncToggle.addEventListener('change', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url?.includes('youtube.com')) {
        const response = await chrome.tabs.sendMessage(tab.id!, {
          action: 'setStorageType',
          useSync: syncToggle.checked
        });

        if (response?.success) {
          showStatus(
            syncToggle.checked
              ? 'Settings will now sync across devices'
              : 'Settings will now stay local to this device',
            'success'
          );
          // Reload the current state to reflect any changes
          await loadCurrentState();
        } else {
          showStatus('Failed to change storage setting', 'error');
          // Revert the toggle state
          syncToggle.checked = !syncToggle.checked;
        }
      }
    } catch (error) {
      console.error('Error changing storage type:', error);
      showStatus('Failed to change storage setting', 'error');
      // Revert the toggle state
      syncToggle.checked = !syncToggle.checked;
    }
  });

  async function loadCurrentState(): Promise<void> {
    const youtubeChannel = await getCurrentYouTubeChannel();
    let settings: ChannelSettings | undefined;
    let useSync = false;

    if (youtubeChannel) {
      // Get current storage preference and settings from content script
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url?.includes('youtube.com')) {
          const response = await chrome.tabs.sendMessage(tab.id!, { action: 'getState' });
          useSync = response?.useSync || false;

          // Update sync toggle state
          syncToggle.checked = useSync;
        }
      } catch (error) {
        console.error('Error getting state from content script:', error);
      }

      // Load settings from appropriate storage based on the preference
      const storage = useSync ? chrome.storage.sync : chrome.storage.local;
      const result = await storage.get(['yt_twitch_settings']);
      const allSettings: ExtensionSettings = result.yt_twitch_settings || {
        version: 1,
        channels: {},
        lastUpdated: Date.now(),
        useSync: useSync
      };
      settings = allSettings.channels[youtubeChannel];
    }

    // Update sync toggle state
    syncToggle.checked = useSync;
    // If settings exist, show toggle and set state
    if (settings?.twitchChannel) {
      toggleGroup.style.display = 'flex';
      chatToggle.checked = settings.preferredChat === 'twitch';
      toggleText.textContent = chatToggle.checked ? 'Use Twitch Chat' : 'Use YouTube Chat';
      twitchChannelInput.value = settings.twitchChannel;
    } else {
      toggleGroup.style.display = 'none';
      chatToggle.checked = false;
      twitchChannelInput.value = '';
    }
  }

  function showStatus(message: string, type: 'success' | 'error' | 'info'): void {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';

    // Auto-hide after 3 seconds, except for info messages which stay longer
    const hideDelay = type === 'info' ? 5000 : 3000;
    setTimeout(() => {
      status.style.display = 'none';
    }, hideDelay);
  }
});
