/* track streams per tab for popup */
chrome.runtime.onMessage.addListener(async (message, sender) => {
  console.log('Service worker received message: ', message, sender);
  if (!message.action || message.action !== 'set_current_channel') {
    return;
  }

  if (!message.data || !message.data.current_channel) {
    console.warn('No current_channel provided in message data.');
    return;
  }

  if (!sender.tab) {
    console.warn('Message sender has no tab information, cannot associate channel with tab.');
    return;
  }

  if (!sender.tab.id) {
    console.warn('Message sender tab has no ID, cannot associate channel with tab.');
    return;
  }

  console.log('Storing current channel for tab ', sender.tab.id, message.data.current_channel);

  const currentChannelsStore = await chrome.storage.session.get('current_channels');
  const currentChannels = currentChannelsStore.current_channels || {};

  chrome.storage.session.set({
    current_channels: {
      ...currentChannels,
      [sender.tab.id]: message.data.current_channel
    }
  });
  // Return true to indicate async response
  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const currentChannelsStore = await chrome.storage.session.get('current_channels');
  const currentChannels = currentChannelsStore.current_channels || {};
  if (currentChannels[tabId]) {
    delete currentChannels[tabId];
    chrome.storage.session.set({ current_channels: currentChannels });
  }
});
