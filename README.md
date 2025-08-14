# YouTube-Twitch Chat Replacer

A Chrome extension that replaces YouTube live stream chat with Twitch chat while keeping the YouTube stream open.

## Features

- 🔄 **Automatic Detection**: Detects YouTube live streams automatically
- 💬 **Chat Replacement**: Replaces YouTube chat with corresponding Twitch chat
- 🗺️ **Channel Mapping**: Map YouTube channels to their Twitch counterparts
- ⚙️ **Easy Configuration**: Simple popup interface for managing channel mappings
- 🔄 **Switch Back**: Option to switch back to original YouTube chat
- 📱 **Responsive Design**: Works on desktop and mobile layouts

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

### Creating Icons

You'll need to create icon files for the extension:

- `icons/icon16.png` (16x16 pixels)
- `icons/icon48.png` (48x48 pixels)  
- `icons/icon128.png` (128x128 pixels)

You can create these using any image editor. The icons should represent the extension's purpose (e.g., YouTube + Twitch logos combined).

## How to Use

1. **Install the extension** following the instructions above

2. **Visit a YouTube live stream** - the extension will automatically detect it

3. **First time setup**: 
   - If no Twitch channel mapping exists, you'll be prompted to enter the corresponding Twitch username
   - The extension will try to guess the Twitch channel name based on the YouTube channel name

4. **Managing mappings**:
   - Click the extension icon to open the popup
   - Add new YouTube ↔ Twitch channel mappings
   - View and delete existing mappings

5. **Using the chat**:
   - The YouTube chat will be replaced with Twitch chat automatically
   - Click "Switch Back to YouTube Chat" to return to the original chat
   - The stream continues playing normally throughout

## File Structure

```
youtube-twitch-chat/
├── manifest.json          # Extension manifest
├── content.js            # Main logic for chat replacement
├── background.js         # Background service worker
├── popup.html           # Extension popup interface
├── popup.js            # Popup functionality
├── styles.css          # Styling for injected elements
├── icons/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```

## Technical Details

### How It Works

1. **Detection**: The content script monitors YouTube pages for live stream indicators
2. **Channel Mapping**: Maps YouTube channel names to Twitch usernames
3. **Chat Replacement**: Injects Twitch chat iframe in place of YouTube chat
4. **Storage**: Uses Chrome's sync storage to persist channel mappings across devices

### Permissions

- `activeTab`: Access to current YouTube tab
- `storage`: Store channel mappings
- `tabs`: Monitor tab changes
- Host permissions for YouTube and Twitch domains

### Browser Compatibility

- Chrome (Manifest V3)
- **Brave Browser** (Chromium-based) - Recommended
- Edge (Chromium-based)
- Other Chromium-based browsers

### Brave Browser Notes

- Use `brave://extensions/` instead of `chrome://extensions/`
- If Twitch chat doesn't load, check Brave Shields settings
- May need to allow cross-site cookies for Twitch embeds

## Development

### Building

No build process required - this is a vanilla JavaScript extension.

### Testing

1. Load the extension in developer mode
2. Visit various YouTube live streams
3. Test channel mapping functionality
4. Verify chat replacement works correctly

### Common Issues

- **Chat not replacing**: Check if the stream is actually live
- **Twitch chat not loading**: Verify the Twitch channel name is correct
- **Extension not working**: Check for JavaScript errors in the console

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This extension is not affiliated with YouTube or Twitch. It's an independent project created for educational and utility purposes.

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify you're on a live YouTube stream
3. Check that Twitch channel names are spelled correctly
4. Try clearing the extension's storage and re-adding mappings
