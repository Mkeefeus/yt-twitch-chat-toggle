export enum MessageAction {
  GET_SETTINGS = 'getSettings',
  UPDATE_SETTINGS = 'updateSettings'
}

export type MessageRequest<T extends MessageAction = MessageAction> = {
  action: T;
  data?: RequestData[T];
};

type RequestData = {
  [MessageAction.GET_SETTINGS]: undefined;
  [MessageAction.UPDATE_SETTINGS]: Partial<ExtensionSettings>;
};

type ResponseData = {
  [MessageAction.GET_SETTINGS]: ExtensionSettings | undefined;
  [MessageAction.UPDATE_SETTINGS]: undefined;
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
  lastUpdated: number;
  created: number;
}
