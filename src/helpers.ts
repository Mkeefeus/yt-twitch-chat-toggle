export function getLocaleMessage(key: string, substitutions?: string | string[]) {
  if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
    return chrome.i18n.getMessage(key, substitutions as any) || '';
  }
  // Dev fallback: read from a global dev map or return the key
  return (window as any).__DEV_I18N__?.[key] ?? key;
}

export const formatConsoleMessage = (context: string, message: string) =>
  `[${new Date().toISOString()}] [${context}]: ${message}`;
