const prefix = 'yt-twitch-chat';
export enum MessageAction {
  SET_CURRENT_CHANNEL = `${prefix}-set-current-channel`
}

export type Message<T extends MessageAction = MessageAction> = {
  action: T;
  data?: MessageData[T];
};

export type MessageData = {
  [MessageAction.SET_CURRENT_CHANNEL]: { channelName: string };
};

type ResponseData = {
  [MessageAction.SET_CURRENT_CHANNEL]: undefined;
};

export type MessageResponse<T extends MessageAction = MessageAction> = {
  success: boolean;
  data?: ResponseData[T];
};

export type SystemTheme = 'light' | 'dark' | 'system';

export type Theme = 'light' | 'dark';

// These could be interfaces if you plan to extend them
export interface ExtensionSettings {
  version: number;
  channels: Record<string, ChannelSettings>;
  lastUpdated: number;
  keepChatsLoaded: boolean;
  theme: SystemTheme;
  useSync: boolean;
}

export interface ChannelSettings {
  twitchChannel: string;
  preferredChat: 'youtube' | 'twitch';
}
