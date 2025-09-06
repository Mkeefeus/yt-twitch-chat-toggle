import { useEffect, useState } from 'preact/hooks';
import { Popup } from './views/popup.tsx';
import { Settings } from './views/settings.tsx';
import { Cover } from './views/cover.tsx';
import { useTheme } from './hooks/useTheme';
import { isValidYouTubeLivePage } from './helpers/validPage';

// Use new helper for page validation
const ValidateCurrentPage = async (): Promise<boolean> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return false;
  // Run the helper in the tab context
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    func: isValidYouTubeLivePage
  });
  return results[0]?.result || false;
};

export const App = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [isValidWebPage, setIsValidWebPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // This will handle all theme logic including document class updates
  useTheme();

  useEffect(() => {
    const checkPage = async () => {
      setIsLoading(true);
      const isValid = await ValidateCurrentPage();
      setIsValidWebPage(isValid);
      setIsLoading(false);
    };

    checkPage();

    // Listen for tab updates
    const handleTabUpdate = () => {
      checkPage();
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabUpdate);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabUpdate);
    };
  }, []);

  const handleNavigation = () => setShowSettings((s) => !s);

  if (isLoading) {
    return (
      <div className="w-[350px] h-[400px] bg-primary flex items-center justify-center">
        <div className="text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-[350px] h-[400px] bg-primary relative overflow-hidden">
      {!isValidWebPage ? (
        <Cover handleNavigation={handleNavigation} />
      ) : (
        <div className="relative h-full">
          {/* Popup View */}
          <div
            className={`h-full p-4 transition-transform duration-300 ease-in-out ${
              showSettings ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
            }`}
          >
            <Popup handleNavigation={handleNavigation} />
          </div>

          {/* Settings View */}
          <div
            className={`absolute top-0 left-0 w-full h-full p-4 overflow-y-auto transition-transform duration-300 ease-in-out ${
              showSettings ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
          >
            <Settings handleNavigation={handleNavigation} />
          </div>
        </div>
      )}
    </div>
  );
};
