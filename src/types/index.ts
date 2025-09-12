export enum MessageAction {
  GET_SETTINGS = 'getSettings',
  UPDATE_SETTINGS = 'updateSettings',
  GET_CHANNEL_SETTINGS = 'getChannelSettings',
  UPDATE_CHANNEL_SETTINGS = 'updateChannelSettings',
}

export type MessageRequest<T extends MessageAction = MessageAction> = {
  action: T;
  data?: RequestData[T];
};

type RequestData = {
  [MessageAction.GET_SETTINGS]: undefined;
  [MessageAction.UPDATE_SETTINGS]: Partial<ExtensionSettings>;
  [MessageAction.GET_CHANNEL_SETTINGS]: { channelId: string };
  [MessageAction.UPDATE_CHANNEL_SETTINGS]: { channelId: string; data: Partial<ChannelSettings> };
};

type ResponseData = {
  [MessageAction.GET_SETTINGS]: ExtensionSettings | undefined;
  [MessageAction.UPDATE_SETTINGS]: undefined;
  [MessageAction.GET_CHANNEL_SETTINGS]: ChannelSettings | undefined;
  [MessageAction.UPDATE_CHANNEL_SETTINGS]: undefined;
};

export type MessageResponse<T extends MessageAction = MessageAction> = {
  success: boolean;
  data?: ResponseData[T];
};

export type Themes = 'light' | 'dark' | 'system';

// These could be interfaces if you plan to extend them
export interface ExtensionSettings {
  version: number;
  channels: Record<string, ChannelSettings>;
  lastUpdated: number;
  keepChatsLoaded: boolean;
  theme: Themes;
  useSync: boolean;
}

export interface ChannelSettings {
  twitchChannel: string;
  preferredChat: 'youtube' | 'twitch';
}
