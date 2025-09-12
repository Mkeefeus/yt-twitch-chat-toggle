import { YoutubeTwitchChatToggleWorker } from './workers/toggle';
import { YoutubeTwitchChatNavigationWorker } from './workers/navigation';
import { YoutubeTwitchChatChatWorker } from './workers/chat';
import { YoutubeTwitchChatStorageWorker } from './workers/storage';
import { YoutubeTwitchChatThemeWorker } from './workers/theme';

const handleStreamLoaded = () => {
  console.log('yt-twitch-chat: Stream loaded, handle accordingly');
  const storageWorker = new YoutubeTwitchChatStorageWorker();
  const themeWorker = new YoutubeTwitchChatThemeWorker(storageWorker);
  new YoutubeTwitchChatToggleWorker(storageWorker);
  new YoutubeTwitchChatChatWorker(storageWorker, themeWorker);
};

new YoutubeTwitchChatNavigationWorker(handleStreamLoaded);
