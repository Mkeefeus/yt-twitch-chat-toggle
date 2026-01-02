/*
              Copyright (C) 2026  Malcolm Keefe

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { MessageAction, type Message, type MessageData, type MessageResponse } from '../types';

function isValidMessage(message: any): message is Message {
  return (
    message &&
    typeof message === 'object' &&
    'action' in message &&
    'data' in message &&
    Object.values(MessageAction).includes(message.action)
  );
}

// Make a specific type guard that ensures data is present and valid
function isValidMessageWithData<T extends MessageAction>(
  message: Message,
  action: T
): message is Message<T> & { data: MessageData[T] } {
  if (message.action !== action || !message.data) {
    return false;
  }

  switch (action) {
    case MessageAction.SET_CURRENT_CHANNEL:
      return typeof message.data.channelName === 'string';
    default:
      return false;
  }
}

/* track streams per tab for popup */
async function setCurrentChannel(
  message: Message<MessageAction.SET_CURRENT_CHANNEL>,
  sender: chrome.runtime.MessageSender
): Promise<boolean> {
  if (!isValidMessageWithData(message, MessageAction.SET_CURRENT_CHANNEL)) {
    console.warn('Invalid message data for SET_CURRENT_CHANNEL');
    return false;
  }
  if (!sender.tab) {
    console.warn('Message sender has no tab, cannot associate channel with tab.');
    return false;
  }
  if (!sender.tab.id) {
    console.warn('Message sender tab has no ID, cannot associate channel with tab.');
    return false;
  }
  console.log('Storing current channel for tab ', sender.tab.id, message.data.channelName);
  try {
    const currentChannelsStore = await chrome.storage.session.get('current_channels');
    const currentChannels = currentChannelsStore.current_channels || {};
    await chrome.storage.session.set({
      current_channels: {
        ...currentChannels,
        [sender.tab.id]: message.data.channelName
      }
    });
    return true;
  } catch (e) {
    console.error(
      'Error setting current channel for tab ',
      sender.tab.id,
      message.data.channelName,
      e
    );
    return false;
  }
}

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): boolean => {
    console.log('Service worker received message: ', message, sender);

    if (!isValidMessage(message)) {
      return false;
    }

    // Handle async operations
    (async () => {
      try {
        switch (message.action) {
          case MessageAction.SET_CURRENT_CHANNEL: {
            const success = await setCurrentChannel(message, sender);
            sendResponse({ success });
            break;
          }
          default:
            console.warn('Unhandled message action received: ', message.action);
            sendResponse({ success: false });
            break;
        }
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false });
      }
    })();

    // Return true to indicate we'll send a response asynchronously
    return true;
  }
);

chrome.tabs.onRemoved.addListener(async (tabId: number): Promise<void> => {
  const currentChannelsStore = await chrome.storage.session.get('current_channels');
  const currentChannels = currentChannelsStore.current_channels || {};
  if (currentChannels[tabId]) {
    delete currentChannels[tabId];
    await chrome.storage.session.set({ current_channels: currentChannels });
  }
});
