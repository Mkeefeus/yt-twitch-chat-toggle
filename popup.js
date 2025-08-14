document.addEventListener('DOMContentLoaded', async function() {
    const twitchChannelInput = document.getElementById('twitchChannel');
    const chatToggle = document.getElementById('chatToggle');
    const autoFillBtn = document.getElementById('autoFillBtn');
    const saveBtn = document.getElementById('saveBtn');
    const changeChannelBtn = document.getElementById('changeChannelBtn');
    const status = document.getElementById('status');
    const channelInfo = document.getElementById('channelInfo');
    const currentChannelDisplay = document.getElementById('currentChannel');
    
    // Load current state from content script
    await loadCurrentState();
    
    // Auto-fill button functionality
    autoFillBtn.addEventListener('click', async function() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab && tab.url.includes('youtube.com')) {
                // Extract channel name from YouTube URL or page
                const results = await chrome.tabs.sendMessage(tab.id, {action: 'getChannelName'});
                if (results && results.channelName) {
                    twitchChannelInput.value = results.channelName.toLowerCase().replace(/\s+/g, '');
                    showStatus('Auto-filled from YouTube channel', 'success');
                } else {
                    showStatus('Could not detect YouTube channel name', 'error');
                }
            } else {
                showStatus('Please navigate to a YouTube page first', 'error');
            }
        } catch (error) {
            console.error('Auto-fill error:', error);
            showStatus('Error getting channel name', 'error');
        }
    });
    
    // Save button functionality
    saveBtn.addEventListener('click', async function() {
        const twitchChannel = twitchChannelInput.value.trim();
        const useTwitchChat = chatToggle.checked;
        
        if (!twitchChannel && useTwitchChat) {
            showStatus('Please enter a Twitch channel name', 'error');
            return;
        }
        
        try {
            await chrome.storage.sync.set({
                twitchChannel: twitchChannel,
                useTwitchChat: useTwitchChat
            });
            
            // Send message to content script to apply changes
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab && tab.url.includes('youtube.com')) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'updateSettings',
                    twitchChannel: twitchChannel,
                    useTwitchChat: useTwitchChat
                });
            }
            
            showStatus('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Save error:', error);
            showStatus('Error saving settings', 'error');
        }
    });
    
    // Real-time toggle functionality
    chatToggle.addEventListener('change', async function() {
        const twitchChannel = twitchChannelInput.value.trim();
        
        if (chatToggle.checked && !twitchChannel) {
            showStatus('Please enter a Twitch channel name first', 'error');
            chatToggle.checked = false;
            return;
        }
        
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab && tab.url.includes('youtube.com')) {
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleChat'
                });
                
                if (response && response.success) {
                    // Update our toggle to match the actual state
                    chatToggle.checked = response.useTwitchChat;
                    showStatus(
                        `Switched to ${response.useTwitchChat ? 'Twitch' : 'YouTube'} chat`, 
                        'success'
                    );
                } else {
                    // Revert toggle if failed
                    chatToggle.checked = !chatToggle.checked;
                    showStatus('Failed to toggle chat', 'error');
                }
            } else {
                chatToggle.checked = !chatToggle.checked;
                showStatus('Please navigate to a YouTube page first', 'error');
            }
        } catch (error) {
            console.error('Toggle error:', error);
            chatToggle.checked = !chatToggle.checked;
            showStatus('Error toggling chat', 'error');
        }
    });
    
    // Change channel button functionality
    changeChannelBtn.addEventListener('click', async function() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab && tab.url.includes('youtube.com')) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'changeChannel'
                });
                showStatus('Channel prompt opened on page', 'success');
                // Close popup after triggering the prompt
                window.close();
            } else {
                showStatus('Please navigate to a YouTube page first', 'error');
            }
        } catch (error) {
            console.error('Change channel error:', error);
            showStatus('Error opening channel prompt', 'error');
        }
    });
    
    async function loadCurrentState() {
        try {
            // First try to get state from content script (more up-to-date)
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (tab && tab.url.includes('youtube.com')) {
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'getState'
                    });
                    
                    if (response) {
                        twitchChannelInput.value = response.twitchChannel || '';
                        chatToggle.checked = response.useTwitchChat || false;
                        
                        // Display current YouTube channel
                        if (response.currentYouTubeChannel) {
                            currentChannelDisplay.textContent = `YouTube: ${response.currentYouTubeChannel}`;
                            channelInfo.style.display = 'block';
                        }
                        
                        // Show settings status
                        if (response.hasSettings) {
                            showStatus(`Settings loaded for ${response.currentYouTubeChannel}`, 'success');
                        } else {
                            showStatus(`New channel: ${response.currentYouTubeChannel}`, 'info');
                        }
                        
                        return;
                    }
                } catch (error) {
                    console.log('Content script not ready, falling back to storage');
                }
            }
            
            // Fallback to storage (legacy support)
            const result = await chrome.storage.sync.get(['channelSettings']);
            if (result.channelSettings) {
                // Show that we have channel-specific settings available
                showStatus('Using channel-specific settings', 'info');
            } else {
                // Legacy fallback
                const legacyResult = await chrome.storage.sync.get(['twitchChannel', 'useTwitchChat']);
                twitchChannelInput.value = legacyResult.twitchChannel || '';
                chatToggle.checked = legacyResult.useTwitchChat || false;
            }
        } catch (error) {
            console.error('Error loading current state:', error);
        }
    }
    
    function showStatus(message, type) {
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
