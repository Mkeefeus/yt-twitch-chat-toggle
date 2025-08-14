// Background script for YouTube-Twitch Chat Replacer

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('YouTube-Twitch Chat Replacer installed');
        
        // Set default settings
        chrome.storage.sync.set({
            twitchChannel: '',
            useTwitchChat: false
        });
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This will open the popup, no additional action needed
    console.log('Extension icon clicked');
});

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only react to complete page loads on YouTube
    if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('youtube.com/watch')) {
        
        // Content script is already injected via manifest, 
        // but we can perform additional setup here if needed
        console.log('YouTube watch page loaded:', tab.url);
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    // Handle any background-specific logic here
    switch (request.action) {
        case 'logEvent':
            console.log('Event logged:', request.data);
            sendResponse({success: true});
            break;
    }
    
    return true; // Keep message channel open
});
