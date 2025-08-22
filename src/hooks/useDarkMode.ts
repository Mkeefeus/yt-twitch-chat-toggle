import { useEffect, useState } from 'preact/hooks';
import { MessageAction } from '../types';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Get initial dark mode setting from extension settings
    const fetchDarkMode = async () => {
      const response = await chrome.runtime.sendMessage({
        action: MessageAction.GET_SETTINGS
      });
      if (response.success && response.data) {
        setIsDark(response.data.darkMode);
        updateDocumentClass(response.data.darkMode);
      }
    };
    fetchDarkMode();
  }, []);

  const updateDocumentClass = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    updateDocumentClass(newDarkMode);
    
    // Update extension settings
    chrome.runtime.sendMessage({
      action: MessageAction.UPDATE_SETTINGS,
      data: { darkMode: newDarkMode }
    });
  };

  return { isDark, toggleDarkMode };
}