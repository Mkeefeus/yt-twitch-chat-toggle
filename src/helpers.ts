export function getLocaleMessage(key: string, substitutions?: string | string[]) {
  // @ts-ignore - optional: install @types/chrome for proper types
  if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
    // chrome.i18n.getMessage accepts either string or string[] for substitutions
    return chrome.i18n.getMessage(key, substitutions as any) || ''
  }
  // Dev fallback: read from a global dev map or return the key
  return (window as any).__DEV_I18N__?.[key] ?? key
}