import { formatConsoleMessage, getLocaleMessage } from '../helpers';
import { ToggleSetting } from '../components/ToggleSetting';
import { MessageAction, type ExtensionSettings, type MessageResponse } from '../types';
import { useEffect, useState } from 'preact/hooks';

export function Settings({ handleNavigation }: { handleNavigation: (route: string) => void }) {
  const title = getLocaleMessage('settings_title');
  const description = getLocaleMessage('settings_description');
  console.log(formatConsoleMessage('yt-twitch-chat-settings', 'Rendering Settings component'));
  // const storageMode = 'local'; //update this to get from serviceworker
  const [settings, setSettings] = useState<ExtensionSettings | undefined>(undefined);
  useEffect(() => {
    const fetchSettings = async () => {
      console.log(
        formatConsoleMessage('yt-twitch-chat-settings', 'Fetching settings from service worker')
      );
      const response: MessageResponse<MessageAction.GET_SETTINGS> =
        await chrome.runtime.sendMessage({
          action: MessageAction.GET_SETTINGS // Use the enum, not the string 'getSettings'
        });
      if (!response.success) {
        console.error(formatConsoleMessage('yt-twitch-chat-settings', 'Failed to fetch settings'));
        return;
      }
      console.log(formatConsoleMessage('yt-twitch-chat-settings', 'Settings fetched successfully'));
      setSettings(response.data);
    };
    fetchSettings();
  }, []);
  const toggleStorageMode = () => {
    // Update the storage mode setting
  };

  return (
    <div>
      <h1 class="text-2xl font-bold">{title}</h1>
      <p class="mt-2">{description}</p>
      <ToggleSetting
        title={getLocaleMessage('storage_mode_toggle_title')}
        description={getLocaleMessage('storage_mode_toggle_description')}
        enabled={settings?.storageMode !== 'local'}
        onChange={toggleStorageMode}
      />
      <button
        class="mt-4 w-full bg-gray-200 text-gray-800 rounded-lg px-4 py-2 hover:bg-gray-300"
        onClick={() => handleNavigation('settings')}
      >
        {'<- Back'}
      </button>
    </div>
  );
}
