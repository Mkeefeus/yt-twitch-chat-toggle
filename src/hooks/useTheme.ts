import { useEffect, useState } from 'react';
import { MessageAction, type MessageRequest, type MessageResponse, type Themes } from '../types';

export function useTheme() {
  const [theme, setTheme] = useState<Themes>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };

    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryList.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    const fetchDarkMode = async () => {
      const response: MessageResponse<MessageAction.GET_SETTINGS> =
        await chrome.runtime.sendMessage({
          action: MessageAction.GET_SETTINGS
        });
      if (response.success && response.data) {
        setTheme(response.data.theme);
      }
    };
    fetchDarkMode();
  }, []);

  useEffect(() => {
    updateDocumentClass(theme);
  }, [theme]);

  const updateDocumentClass = (theme: Themes) => {
    switch (theme) {
      case 'dark':
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        break;
      case 'light':
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        break;
      case 'system':
        if (systemTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
        break;
    }
  };

  const updateTheme = async (newTheme: Themes): Promise<void> => {
    setTheme(newTheme);
    updateDocumentClass(newTheme);

    const updateRequest: MessageRequest<MessageAction.UPDATE_SETTINGS> = {
      action: MessageAction.UPDATE_SETTINGS,
      data: { theme: newTheme }
    };

    try {
      const response: MessageResponse<MessageAction.UPDATE_SETTINGS> =
        await chrome.runtime.sendMessage(updateRequest);

      if (!response.success) {
        console.error('Failed to update theme setting');
      }
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  return { theme, updateTheme, systemTheme };
}
