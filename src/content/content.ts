/*
              Copyright (C) 2026  Malcolm Keefe

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { YoutubeTwitchChatToggleWorker } from '../workers/toggle';
import { YoutubeTwitchChatNavigationWorker } from '../workers/navigation';
import { YoutubeTwitchChatChatWorker } from '../workers/chat';
import { YoutubeTwitchChatStorageWorker } from '../workers/storage';
import { YoutubeTwitchChatThemeWorker } from '../workers/theme';
import { formatConsoleMessage } from '../utils';
import { EXTENSION_PREFIX } from '../constants';

let storageWorker: YoutubeTwitchChatStorageWorker | undefined = undefined;
let themeWorker: YoutubeTwitchChatThemeWorker | undefined = undefined;
let toggleWorker: YoutubeTwitchChatToggleWorker | undefined = undefined;
let chatWorker: YoutubeTwitchChatChatWorker | undefined = undefined;
const navigationWorker = new YoutubeTwitchChatNavigationWorker();
console.log(formatConsoleMessage('ContentScript', 'Content script initialized: '));

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
window.addEventListener(`${EXTENSION_PREFIX}-stream-loaded`, handleStreamLoaded);
// navigationWorker.onStreamUnloaded(handleStreamUnloaded);
window.addEventListener(`${EXTENSION_PREFIX}-stream-unloaded`, handleStreamUnloaded);
