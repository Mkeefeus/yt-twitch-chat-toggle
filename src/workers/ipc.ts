import { formatConsoleMessage } from '../utils';
import { MessageAction, type Message, type MessageResponse } from '../types';
import { YoutubeTwitchChatStorageWorker } from './storage';

export class YoutubeTwitchChatIPCWorker {
  private storageWorker: YoutubeTwitchChatStorageWorker;

  constructor(storageWorker: YoutubeTwitchChatStorageWorker) {
    this.storageWorker = storageWorker;
    this.setupMessageListener();
    console.log(formatConsoleMessage('IPCWorker', 'IPC Worker initialized'));
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener(
      (
        message: Message,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: MessageResponse) => void
      ) => {
        console.log(
          formatConsoleMessage('IPCWorker', `Received message: ${JSON.stringify(message)}`)
        );

        this.handleMessageAsync(message, sender, sendResponse);
        return true;
      }
    );
  }

  private async handleMessageAsync(
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: MessageResponse) => void
  ) {
    try {
      switch (message.action) {
        case MessageAction.GET_SETTINGS:
          await this.handleGetSettings(sender, sendResponse);
          break;
        case MessageAction.UPDATE_SETTINGS:
          await this.handleUpdateSettings(
            message as Message<MessageAction.UPDATE_SETTINGS>,
            sender,
            sendResponse
          );
          break;
        case MessageAction.GET_CHANNEL_SETTINGS:
          await this.handleGetChannelSettings(
            message as Message<MessageAction.GET_CHANNEL_SETTINGS>,
            sender,
            sendResponse
          );
          break;
        case MessageAction.UPDATE_CHANNEL_SETTINGS:
          await this.handleUpdateChannelSettings(
            message as Message<MessageAction.UPDATE_CHANNEL_SETTINGS>,
            sender,
            sendResponse
          );
          break;
        default:
          console.warn(formatConsoleMessage('IPCWorker', `Unknown action: ${message.action}`));
          sendResponse({ success: false });
      }
    } catch (error) {
      console.error(formatConsoleMessage('IPCWorker', 'Error handling message'), error);
      sendResponse({ success: false, data: undefined });
    }
  }

  private async handleGetSettings(
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: MessageResponse<MessageAction.GET_SETTINGS>) => void
  ) {
    console.log(
      formatConsoleMessage(
        'IPCWorker',
        `Received request to get settings from: ${sender.tab?.url || 'popup'}`
      )
    );

    const settings = await this.storageWorker.getSettings();
    if (!settings) {
      console.error(formatConsoleMessage('IPCWorker', 'Failed to retrieve settings'));
      sendResponse({ success: false, data: undefined });
      return;
    }

    sendResponse({ success: true, data: settings });
  }

  private async handleUpdateSettings(
    message: Message<MessageAction.UPDATE_SETTINGS>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: MessageResponse<MessageAction.UPDATE_SETTINGS>) => void
  ) {
    console.log(
      formatConsoleMessage(
        'IPCWorker',
        `Received request to update settings from: ${sender.tab?.url || 'popup'}`
      )
    );

    if (!message.data) {
      console.error(formatConsoleMessage('IPCWorker', 'No data provided for update'));
      sendResponse({ success: false });
      return;
    }

    const updateCompleted = await this.storageWorker.updateSettings(message.data);
    if (!updateCompleted) {
      console.error(formatConsoleMessage('IPCWorker', 'Failed to update settings'));
    }

    if (message.data.useSync !== undefined) {
      await this.storageWorker.migrateStorage();
    }

    console.log(formatConsoleMessage('IPCWorker', 'Settings updated successfully'));
    sendResponse({ success: updateCompleted });
  }

  private async handleGetChannelSettings(
    message: Message<MessageAction.GET_CHANNEL_SETTINGS>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: MessageResponse<MessageAction.GET_CHANNEL_SETTINGS>) => void
  ) {
    console.log(
      formatConsoleMessage(
        'IPCWorker',
        `Received request to get channel settings from: ${sender.tab?.url || 'unknown'}`
      )
    );
    if (!message.data) {
      console.error(
        formatConsoleMessage('IPCWorker', 'No data provided for channel settings request')
      );
      sendResponse({ success: false });
      return;
    }

    const channelSettings = await this.storageWorker.getChannelSettings(message.data.channelId);
    if (!channelSettings) {
      console.error(
        formatConsoleMessage(
          'IPCWorker',
          `No channel settings found for channel ID: ${message.data.channelId}`
        )
      );
      sendResponse({ success: false, data: undefined });
      return;
    }

    sendResponse({ success: true, data: channelSettings });
  }

  private async handleUpdateChannelSettings(
    message: Message<MessageAction.UPDATE_CHANNEL_SETTINGS>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: MessageResponse<MessageAction.UPDATE_CHANNEL_SETTINGS>) => void
  ) {
    console.log(
      formatConsoleMessage(
        'IPCWorker',
        `Received request to update channel settings from: ${sender.tab?.url || 'unknown'}`
      )
    );

    if (!message.data) {
      console.error(
        formatConsoleMessage('IPCWorker', 'No data provided for channel settings update')
      );
      sendResponse({ success: false });
      return;
    }

    const updateCompleted = await this.storageWorker.updateChannelSettings(
      message.data.channelId,
      message.data.data
    );
    if (!updateCompleted) {
      console.error(formatConsoleMessage('IPCWorker', 'Failed to update channel settings'));
    }

    sendResponse({ success: updateCompleted });
  }
}
