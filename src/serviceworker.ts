import { YoutubeTwitchChatStorageWorker } from './workers/storage';
import { YoutubeTwitchChatIPCWorker } from './workers/ipc';

const storageWorker = new YoutubeTwitchChatStorageWorker();
new YoutubeTwitchChatIPCWorker(storageWorker);
