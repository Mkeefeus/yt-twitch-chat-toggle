# YouTube-Twitch Chat Replacer

A Chrome/Brave browser extension that replaces YouTube live stream chat with Twitch chat while keeping the stream open. Perfect for streamers who simulcast or viewers who prefer Twitch chat features.

## Features

- 🔄 **Seamless Chat Switching**: Toggle between YouTube and Twitch chat with one click
- 🎯 **Auto-Fill Channel Names**: Automatically detect YouTube channel and suggest Twitch channel
- 🌓 **Dark/Light Mode Support**: Respects your browser's theme preference
- 📱 **Responsive Design**: Works in both default and theater mode on YouTube
- ⚡ **SPA Navigation**: Handles YouTube's single-page application navigation
- 💾 **Settings Persistence**: Remembers your preferences across browser sessions

## Installation

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. Clone or download this repository
2. Open Chrome/Brave browser
3. Navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the folder containing this extension
7. The extension icon should appear in your browser toolbar

### Method 2: Install from Chrome Web Store

*Coming soon - extension will be published to the Chrome Web Store*

## Usage

### Initial Setup

1. Click the extension icon in your browser toolbar
2. Enter the Twitch channel name you want to display
3. Use the 🔄 button to auto-fill from the current YouTube channel name
4. Toggle "Use Twitch Chat" to enable Twitch chat replacement
5. Click "Save Settings"

### While Watching YouTube Live Streams

1. Navigate to any YouTube live stream
2. The extension will automatically detect the chat container
3. Use the toggle button (appears in the top-right of the chat area) to switch between YouTube and Twitch chat
4. Your preference is automatically saved

### Features in Detail

#### Auto-Fill Channel Names
- The extension can automatically detect the YouTube channel name
- Click the 🔄 button in the popup to auto-fill the Twitch channel field
- The extension will attempt to format the name appropriately for Twitch

#### Dark/Light Mode Support
- Automatically detects your browser's dark/light mode preference
- Twitch chat iframe adjusts accordingly
- Toggle button styling matches YouTube's theme

#### Theater Mode Compatibility
- Works seamlessly with YouTube's theater mode
- Chat container maintains proper dimensions
- Toggle button remains accessible

## Technical Details

### Browser Compatibility
- Google Chrome (Manifest V3)
- Brave Browser
- Microsoft Edge (Chromium-based)
- Other Chromium-based browsers

### Permissions Required
- `activeTab`: To interact with YouTube pages
- `storage`: To save user preferences
- `tabs`: To detect navigation and page changes
- Host permissions for `youtube.com` and `twitch.tv`

### File Structure
```
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── content.js             # Main content script logic
├── background.js          # Background service worker
├── styles.css             # Content script styles
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## Development

### Local Development Setup

1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test changes on YouTube live streams

### Building for Production

The extension is ready for production use as-is. For Chrome Web Store submission:

1. Ensure all icons are properly sized (16x16, 48x48, 128x128)
2. Test on multiple YouTube live streams
3. Verify compatibility with different browser themes
4. Package as ZIP file for submission

## Troubleshooting

### Common Issues

**Extension not working on YouTube:**
- Ensure the extension is enabled in `chrome://extensions/`
- Check that you're on a YouTube live stream page (`/watch` URL)
- Try refreshing the page

**Twitch chat not loading:**
- Verify the Twitch channel name is correct and exists
- Check that the channel is live or has chat enabled
- Ensure your browser allows third-party frames

**Toggle button not appearing:**
- Wait for the YouTube page to fully load
- Check if you're on a live stream (not a regular video)
- Try refreshing the page

**Settings not saving:**
- Check browser's storage permissions
- Try disabling and re-enabling the extension

### Debug Mode

Open browser developer tools (F12) and check the console for any error messages. The extension logs helpful information for debugging.

## Privacy

This extension:
- Only accesses YouTube pages when explicitly granted permission
- Stores settings locally in your browser (not on external servers)
- Does not collect or transmit personal data
- Only loads Twitch chat iframes when explicitly enabled

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on various YouTube live streams
5. Submit a pull request

## License

This project is open source. Feel free to modify and distribute according to your needs.

## Changelog

### Version 1.0.0
- Initial release
- Basic chat replacement functionality
- Dark/light mode support
- Theater mode compatibility
- Settings persistence
- Auto-fill channel names

## Support

If you encounter issues or have feature requests, please open an issue on the repository or contact the maintainer.
