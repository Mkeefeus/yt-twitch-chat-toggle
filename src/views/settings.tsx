import { getLocaleMessage } from '../helpers';
import { ToggleSetting } from '../components/ToggleSetting';

function sendMessage(type: string, data?: any) {
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type, data });
  } else {
    console.warn('Service worker not available');
  }
}

export function Settings({ handleNavigation }: { handleNavigation: (route: string) => void }) {
  const title = getLocaleMessage('settings_title');
  const description = getLocaleMessage('settings_description');
  const storageMode = 'local'; //update this to get from serviceworker
  const toggleStorageMode = () => {
    // Update the storage mode setting
    sendMessage('switchStorageType');
  };

  return (
    <div>
      <h1 class="text-2xl font-bold">{title}</h1>
      <p class="mt-2">{description}</p>
      <ToggleSetting
        title={getLocaleMessage('storage_mode_toggle_title')}
        description={getLocaleMessage('storage_mode_toggle_description')}
        enabled={storageMode !== 'local'}
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
