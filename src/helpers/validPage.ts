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
