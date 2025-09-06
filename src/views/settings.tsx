import { formatConsoleMessage, getLocaleMessage } from '../helpers';
import { ToggleSetting } from '../components/ToggleSetting';
import { MessageAction, type ExtensionSettings, type MessageResponse } from '../types';
import { useEffect, useState } from 'preact/hooks';
import { ThemeSetting } from '../components/ThemeSetting';

// These are evaluated once when the module loads
const SETTINGS_TITLE = getLocaleMessage('settings_title');
const SETTINGS_DESCRIPTION = getLocaleMessage('settings_description');

export function Settings({ handleNavigation }: { handleNavigation: (route: string) => void }) {
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

  const toggleSetting = (key: keyof ExtensionSettings) => {
    if (!settings) return;
    const newValue = !settings[key];
    setSettings({ ...settings, [key]: newValue });
    chrome.runtime.sendMessage({
      action: MessageAction.UPDATE_SETTINGS,
      data: { [key]: newValue }
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary">{SETTINGS_TITLE}</h1>
      <p className="mt-2 text-secondary">{SETTINGS_DESCRIPTION}</p>
      <ToggleSetting
        title={getLocaleMessage('storage_mode_toggle_title')}
        description={getLocaleMessage('storage_mode_toggle_description')}
        enabled={settings?.useSync || false}
        onChange={() => toggleSetting('useSync')}
      />
      <ToggleSetting
        title={getLocaleMessage('keep_chats_loaded_title')}
        description={getLocaleMessage('keep_chats_loaded_description')}
        enabled={settings?.keepChatsLoaded || false}
        onChange={() => toggleSetting('keepChatsLoaded')}
      />
      <ThemeSetting />
      <button
        className="mt-4 w-full nav-button rounded-lg px-4 py-2"
        onClick={() => handleNavigation('settings')}
      >
        {'<- Back'}
      </button>
    </div>
  );
}
