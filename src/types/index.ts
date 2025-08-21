export enum MessageAction {
  SWITCH_STORAGE_TYPE = 'switchStorageType',
  GET_SETTINGS = 'getSettings'
}

enum StorageTypes {
  LOCAL = 'local',
  SYNC = 'sync'
}

export type MessageRequest = {
  action: MessageAction;
};

type ResponseData = {
  [MessageAction.GET_SETTINGS]: ExtensionSettings | undefined;
  [MessageAction.SWITCH_STORAGE_TYPE]: StorageTypes;
};

export type MessageResponse<T extends MessageAction = MessageAction> = {
  success: boolean;
  data?: ResponseData[T];
};

// These could be interfaces if you plan to extend them
export interface ExtensionSettings {
  version: number;
  channels: Record<string, ChannelSettings>;
  lastUpdated: number;
  preloadBothChats?: boolean;
  theme: 'light' | 'dark' | 'system';
  storageMode: 'local' | 'sync';
}

export interface ChannelSettings {
  twitchChannel: string;
  preferredChat: 'youtube' | 'twitch';
  lastUpdated: number;
  created: number;
}
