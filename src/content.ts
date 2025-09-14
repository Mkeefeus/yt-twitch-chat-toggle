import { YoutubeTwitchChatToggleWorker } from './workers/toggle';
import { YoutubeTwitchChatNavigationWorker } from './workers/navigation';
import { YoutubeTwitchChatChatWorker } from './workers/chat';
import { YoutubeTwitchChatStorageWorker } from './workers/storage';
import { YoutubeTwitchChatThemeWorker } from './workers/theme';
import { formatConsoleMessage } from './helpers';

const initializeContentScript = () => {
  let storageWorker: YoutubeTwitchChatStorageWorker | undefined = undefined;
  let themeWorker: YoutubeTwitchChatThemeWorker | undefined = undefined;
  let chatWorker: YoutubeTwitchChatChatWorker | undefined = undefined;
  let toggleWorker: YoutubeTwitchChatToggleWorker | undefined = undefined;

  const handleStreamLoaded = () => {
    console.log(formatConsoleMessage('ContentScript', 'Stream loaded, initializing workers'));
    storageWorker = new YoutubeTwitchChatStorageWorker();
    themeWorker = new YoutubeTwitchChatThemeWorker(storageWorker);
    toggleWorker = new YoutubeTwitchChatToggleWorker(storageWorker);
    chatWorker = new YoutubeTwitchChatChatWorker(storageWorker, themeWorker);
  };

  const handleStreamUnloaded = () => {
    console.log(formatConsoleMessage('ContentScript', 'Stream unloaded, cleaning up'));
    chatWorker?.destroy();
    toggleWorker?.destroy();
    themeWorker?.destroy();
    // Nullify references
    storageWorker = undefined;
    themeWorker = undefined;
    chatWorker = undefined;
    toggleWorker = undefined;
  };

  const navigationWorker = new YoutubeTwitchChatNavigationWorker();
  navigationWorker.onStreamLoaded(handleStreamLoaded);
  navigationWorker.onStreamUnloaded(handleStreamUnloaded);
};

initializeContentScript();
