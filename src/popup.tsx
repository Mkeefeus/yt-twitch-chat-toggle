import { useState } from 'preact/hooks';
import { getLocaleMessage } from './helpers';
import './tailwind.css';
import { ToggleSetting } from './components/ToggleSetting';

export function Popup() {
  const [title] = useState(getLocaleMessage('extension_name'));
  const [description] = useState(getLocaleMessage('extension_description'));
  const [channel, setChannel] = useState('');
  const [twitchChatEnabled, setTwitchChatEnabled] = useState(false);

  const handleSaveChannel = () => {
    const input = document.getElementById('twitch-channel') as HTMLInputElement;
    setChannel(input.value);
    // Send message to service worker script to save
  };

  return (
    <>
      <div class="min-w-[300px] max-w-[400px] p-4 bg-white rounded-lg shadow-lg border border-gray-200">
        <h1 class="text-2xl font-bold">{title}</h1>
        <p class="mt-2">{description}</p>
        <div class="flex justify-between mt-4">
          <input
            type="text"
            id="twitch-channel"
            class="border border-gray-300 rounded-lg p-2 flex-1"
            placeholder="Twitch Channel"
          />
          <button class="ml-2 flex-shrink-0 bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600">
            Auto
          </button>
        </div>
        {channel ? (
          <ToggleSetting
            title="Use Twitch Chat"
            description="Enable or disable Twitch chat integration"
            enabled={twitchChatEnabled}
            onChange={() => {
              setTwitchChatEnabled(!twitchChatEnabled);
            }}
          />
        ) : (
          <button
            class="mt-4 w-full bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600"
            onClick={handleSaveChannel}
          >
            Save
          </button>
        )}
      </div>
    </>
  );
}
