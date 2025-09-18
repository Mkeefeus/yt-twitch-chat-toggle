import { YoutubeTwitchChatToggleWorker } from './workers/toggle';
import { YoutubeTwitchChatNavigationWorker } from './workers/navigation';
import { YoutubeTwitchChatChatWorker } from './workers/chat';
import { YoutubeTwitchChatStorageWorker } from './workers/storage';
import { YoutubeTwitchChatThemeWorker } from './workers/theme';
import { formatConsoleMessage } from './helpers';

const initializeContentScript = () => {
  let storageWorker: YoutubeTwitchChatStorageWorker | undefined = undefined;
  let themeWorker: YoutubeTwitchChatThemeWorker | undefined = undefined;
  let toggleWorker: YoutubeTwitchChatToggleWorker | undefined = undefined;
  let chatWorker: YoutubeTwitchChatChatWorker | undefined = undefined;
  const navigationWorker = new YoutubeTwitchChatNavigationWorker();
  console.log(
    formatConsoleMessage('ContentScript', 'Content script initialized: ')
  );

  const handleStreamLoaded: EventListener = () => {
    console.log(formatConsoleMessage('ContentScript', 'Stream loaded, initializing workers'));
    const channelName = navigationWorker.channelName;
    storageWorker = new YoutubeTwitchChatStorageWorker();
    themeWorker = new YoutubeTwitchChatThemeWorker(storageWorker);
    toggleWorker = new YoutubeTwitchChatToggleWorker(storageWorker, channelName);
    chatWorker = new YoutubeTwitchChatChatWorker(storageWorker, themeWorker, channelName);
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

  // navigationWorker.onStreamLoaded(handleStreamLoaded);
  window.addEventListener('yt-twitch-chat-stream-loaded', handleStreamLoaded);
  // navigationWorker.onStreamUnloaded(handleStreamUnloaded);
  window.addEventListener('yt-twitch-chat-stream-unloaded', handleStreamUnloaded);
};

initializeContentScript();
