# YouTube Twitch Chat Toggle

A Chrome extension that allows you to seamlessly switch between YouTube and Twitch chat while watching YouTube live streams.

## Features

-   **Toggle between chats** - Switch between YouTube and Twitch chat with one click
-   **Per-channel settings** - Different YouTube channels can be associated with different Twitch channels
-   **Persistent preferences** - Your settings are saved and synced across devices
-   **Live switching** - No page refresh required when toggling chats
-   **Dark mode support** - Automatically matches YouTube's theme

## How It Works

1. **Visit a YouTube live stream** - The extension automatically detects the channel
2. **Associate with Twitch** - First visit shows a prompt to link to a Twitch channel
3. **Set preference** - Choose whether to show YouTube or Twitch chat by default
4. **Toggle anytime** - Use the extension popup to switch between chats instantly

## Installation

### From Chrome Web Store (Coming Soon)

1. Visit the Chrome Web Store listing
2. Click "Add to Chrome"
3. Navigate to any YouTube live stream to start using

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Run `bun install && bun run build` to compile
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the project folder
6. Navigate to a YouTube live stream to start using

## Usage

### First Time Setup

1. Go to any YouTube live stream
2. A prompt will appear asking you to associate this YouTube channel with a Twitch channel
3. Enter the Twitch channel name (without the @ symbol)
4. Choose your preferred default chat (YouTube or Twitch)
5. Click save

### Daily Usage

-   **Popup toggle**: Click the extension icon and use the toggle switch
-   **Automatic loading**: Your preferences are remembered for each YouTube channel

## Privacy

This extension:

-   ✅ Stores settings locally in your browser
-   ✅ Syncs settings across your Chrome browsers (if signed in)
-   ❌ Does not send any data to external servers
-   ❌ Does not track your browsing activity
-   ❌ Does not collect personal information

## Technical Details

-   **Manifest Version**: 3 (Latest Chrome extension standard)
-   **Permissions**: Only requests access to YouTube and Twitch domains
-   **Storage**: Uses Chrome's sync storage for cross-device settings
-   **Framework**: TypeScript with ESLint configuration

## Development

This project uses TypeScript and modern development tools.

### Setup

```bash
bun install
```

### Available Scripts

-   `bun run build` - Compile TypeScript to JavaScript
-   `bun run watch` - Watch mode for development
-   `bun run lint` - Run ESLint code quality checks
-   `bun run lint:fix` - Auto-fix ESLint issues where possible
-   `bun run check` - Run both type checking and linting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have suggestions, please [open an issue](https://github.com/Mkeefeus/yt-twitch-chat-toggle/issues) on GitHub.

## Changelog

### v1.0.0

-   Initial release
-   YouTube channel detection
-   Twitch chat integration
-   Per-channel settings
-   Popup interface
-   Dark mode support
