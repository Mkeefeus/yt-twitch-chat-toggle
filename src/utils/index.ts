export function getLocaleMessage(key: string, substitutions?: string | string[]) {
  if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
    return chrome.i18n.getMessage(key, substitutions as any) || '';
  }
  // Dev fallback: read from a global dev map or return the key
  return (window as any).__DEV_I18N__?.[key] ?? key;
}

export const formatConsoleMessage = (context: string, message: string) =>
  `[${new Date().toISOString()}] [${context}]: ${message}`;
// Utility to check if current page is a valid YouTube live stream

export function isValidYouTubeLivePage(): boolean {
  // Must be a YouTube watch page
  if (!location.href.includes('youtube.com/watch')) return false;

  // Check for live stream indicators
  const liveIndicators = [
    '.ytp-live-badge',
    '[aria-label*="live"]',
    '.ytp-chrome-live',
    '.live-badge'
  ];
  return liveIndicators.some((selector) => document.querySelector(selector));
}
