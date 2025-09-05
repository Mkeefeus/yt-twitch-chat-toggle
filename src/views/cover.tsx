export function Cover({ handleNavigation }: { handleNavigation: (route: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-start h-full p-6 text-center overflow-y-auto custom-scrollbar">
      {/* Icon/Logo */}
      <div className="mb-6 mt-4">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-500 to-purple-600 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-primary mb-4">YouTube ⇄ Twitch Chat Toggle</h1>

      {/* Description */}
      <div className="text-secondary space-y-3 max-w-sm">
        <p>
          This extension allows you to swap between YouTube and Twitch chat while watching YouTube
          live streams.
        </p>
        <p className="text-sm">
          To use this extension, navigate to a YouTube live stream and click the extension icon to
          toggle between chats.
        </p>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-secondary rounded-lg max-w-sm">
        <h3 className="font-semibold text-primary mb-2">How to use:</h3>
        <ol className="text-sm text-secondary space-y-1 text-left">
          <li>1. Go to YouTube</li>
          <li>2. Open a live stream</li>
          <li>3. Click the extension icon</li>
          <li>4. Toggle between chats!</li>
        </ol>
      </div>

      {/* Settings Button */}
      <div className="mt-6 space-y-2 pb-4">
        <button
          className="nav-button rounded-lg px-6 py-2 text-sm font-medium"
          onClick={() => handleNavigation('settings')}
        >
          ⚙️ Settings
        </button>
        <p className="text-xs text-secondary">Configure sync preferences and other options</p>
      </div>
    </div>
  );
}
