// Background script for YouTube-Twitch Chat Replacer

chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === 'install') {
    console.log('YouTube-Twitch Chat Replacer installed');
  }
});

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  // Only react to complete page loads on YouTube
  if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('youtube.com/watch')) {
        
    console.log('YouTube watch page loaded:', tab.url);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request: { action: string; [key: string]: unknown }, sender: chrome.runtime.MessageSender, sendResponse: (response?: { success?: boolean; [key: string]: unknown }) => void) => {
  console.log('Background received message:', request);
    
  // Handle any background-specific logic here
  switch (request.action) {
  case 'logEvent':
    console.log('Event logged:', request.data);
    sendResponse({ success: true });
    break;
  }
    
  return true; // Keep message channel open
});
