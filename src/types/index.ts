const prefix = 'yt-twitch-chat';
export enum MessageAction {
  GET_SETTINGS = `${prefix}-get-settings`,
  UPDATE_SETTINGS = `${prefix}-update-settings`,
  GET_CHANNEL_SETTINGS = `${prefix}-get-channel-settings`,
  UPDATE_CHANNEL_SETTINGS = `${prefix}-update-channel-settings`,
  THEME_CHANGED = `${prefix}-theme-changed`
}

export type Message<T extends MessageAction = MessageAction> = {
  action: T;
  data?: RequestData[T];
};

type RequestData = {
  [MessageAction.GET_SETTINGS]: undefined;
  [MessageAction.UPDATE_SETTINGS]: Partial<ExtensionSettings>;
  [MessageAction.GET_CHANNEL_SETTINGS]: { channelId: string };
  [MessageAction.UPDATE_CHANNEL_SETTINGS]: { channelId: string; data: Partial<ChannelSettings> };
  [MessageAction.THEME_CHANGED]: { theme: Theme };
};

type ResponseData = {
  [MessageAction.GET_SETTINGS]: ExtensionSettings | undefined;
  [MessageAction.UPDATE_SETTINGS]: undefined;
  [MessageAction.GET_CHANNEL_SETTINGS]: ChannelSettings | undefined;
  [MessageAction.UPDATE_CHANNEL_SETTINGS]: undefined;
  [MessageAction.THEME_CHANGED]: undefined;
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
