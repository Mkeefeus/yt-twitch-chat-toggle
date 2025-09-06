import { render } from 'preact';
import { ChatToggle } from './components/ChatToggle';
import { isValidYouTubeLivePage } from './helpers/validPage';

function createToggleElement() {
  // Check if we're on a valid page first
  if (!isValidYouTubeLivePage()) {
    console.log('Not a valid YouTube live page, skipping toggle injection');
    return;
  }

  const controls = document.querySelector<HTMLElement>('.ytp-left-controls');
  if (!controls) {
    console.log('YouTube player controls not found');
    return;
  }

  console.log('YouTube player controls found on valid page');

  // Prevent duplicate injection
  if (controls.querySelector('.yt-chat-toggle-container')) {
    console.log('Toggle already exists, skipping');
    return;
  }

  const container = document.createElement('button');
  container.className = 'ytp-button yt-chat-toggle-container ytp-subtitles-button';
  container.title = 'Swap chat';
  container.setAttribute('data-title-no-tooltip', 'Swap chat');
  container.setAttribute('aria-label', 'Swap chat');
  container.setAttribute('data-tooltip-title', 'Swap chat');
  container.ariaLabel = 'Swap chat';
  controls.append(container);

  return container;
}

function initializeToggle() {
  const container = createToggleElement();
  if (container) {
    render(<ChatToggle />, container);
  }
}

// Handle YouTube's SPA navigation
function handleNavigation() {
  // Small delay to ensure DOM is ready after navigation
  setTimeout(initializeToggle, 100);
}

// Listen for YouTube navigation events
window.addEventListener('yt-navigate-finish', handleNavigation);
window.addEventListener('popstate', handleNavigation);

// Initial load
document.addEventListener('DOMContentLoaded', initializeToggle);

// Fallback for immediate execution
initializeToggle();
