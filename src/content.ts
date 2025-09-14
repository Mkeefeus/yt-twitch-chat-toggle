import { YoutubeTwitchChatToggleWorker } from './workers/toggle';
import { YoutubeTwitchChatNavigationWorker } from './workers/navigation';
import { YoutubeTwitchChatChatWorker } from './workers/chat';
import { YoutubeTwitchChatStorageWorker } from './workers/storage';
import { YoutubeTwitchChatThemeWorker } from './workers/theme';
import { formatConsoleMessage } from './helpers';

const initializeContentScript = () => {
  const handleStreamLoaded = () => {
    console.log(formatConsoleMessage('ContentScript', 'Stream loaded, initializing workers'));
    const storageWorker = new YoutubeTwitchChatStorageWorker();
    const themeWorker = new YoutubeTwitchChatThemeWorker(storageWorker);
    new YoutubeTwitchChatToggleWorker(storageWorker);
    new YoutubeTwitchChatChatWorker(storageWorker, themeWorker);
  };
  const handleStreamUnloaded = () => {
    console.log(formatConsoleMessage('ContentScript', 'Stream unloaded, cleaning up'));
  };

  const navigationWorker = new YoutubeTwitchChatNavigationWorker();
  navigationWorker.onStreamLoaded(handleStreamLoaded);
  navigationWorker.onStreamUnloaded(handleStreamUnloaded);
};

initializeContentScript();
