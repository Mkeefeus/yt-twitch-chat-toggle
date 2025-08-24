import { useEffect, useState } from 'preact/hooks';
import { useTheme } from '../hooks/useTheme';
import type { Themes } from '../types';

export function ThemeSetting() {
  const { theme, updateTheme, systemTheme } = useTheme();
  const BUTTON_BASE_CLASSES = 'px-2 py-1 rounded-md text-sm font-medium transition-colors';
  const CONTAINER_BASE_CLASSES = 'flex rounded-lg p-1';
  const [buttonClasses, setButtonClasses] = useState(BUTTON_BASE_CLASSES);
  const [containerClasses, setContainerClasses] = useState(CONTAINER_BASE_CLASSES);

  useEffect(() => {
    switch (theme) {
      case 'light':
        setButtonClasses(`${BUTTON_BASE_CLASSES} bg-gray-100 text-gray-900 hover:bg-gray-200`);
        setContainerClasses(`${CONTAINER_BASE_CLASSES} bg-gray-100`);
        break;
      case 'dark':
        setButtonClasses(`${BUTTON_BASE_CLASSES} bg-gray-700 text-white hover:bg-gray-600`);
        setContainerClasses(`${CONTAINER_BASE_CLASSES} bg-gray-700`);
        break;
      case 'system':
        if (systemTheme === 'dark') {
          setButtonClasses(`${BUTTON_BASE_CLASSES} bg-gray-700 text-white hover:bg-gray-600`);
          setContainerClasses(`${CONTAINER_BASE_CLASSES} bg-gray-700`);
        } else {
          setButtonClasses(`${BUTTON_BASE_CLASSES} bg-gray-100 text-gray-900 hover:bg-gray-200`);
          setContainerClasses(`${CONTAINER_BASE_CLASSES} bg-gray-100`);
        }
        break;
      default:
        setButtonClasses(BUTTON_BASE_CLASSES);
        setContainerClasses(CONTAINER_BASE_CLASSES);
        break;
    }
  }, [theme]);

  const themeOptions = [
    { value: 'light', label: '☀️', title: 'Light' },
    { value: 'dark', label: '🌙', title: 'Dark' },
    { value: 'system', label: '💻', title: 'Match System' }
  ] as const;

  const handleThemeChange = (newTheme: Themes) => {
    updateTheme(newTheme);
  };

  const getButtonClasses = (optionValue: string) => {
    const isActive = theme === optionValue;

    if (!isActive) {
      return buttonClasses;
    }
    switch (theme) {
      case 'light':
        return `${BUTTON_BASE_CLASSES} bg-white text-gray-900 shadow-sm`;
      case 'dark':
        return `${BUTTON_BASE_CLASSES} bg-gray-600 text-white shadow-sm`;
      case 'system':
        return systemTheme === 'dark'
          ? `${BUTTON_BASE_CLASSES} bg-gray-600 text-white shadow-sm`
          : `${BUTTON_BASE_CLASSES} bg-white text-gray-900 shadow-sm`;
      default:
        return buttonClasses;
    }
  };

  return (
    <div class="flex items-center justify-between py-2">
      <div class="flex flex-col">
        <span class="font-medium text-primary">Theme</span>
        <span class="text-sm text-secondary">Color scheme</span>
      </div>
      <div class={containerClasses}>
        {themeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleThemeChange(option.value as Themes)}
            title={option.title}
            class={getButtonClasses(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
