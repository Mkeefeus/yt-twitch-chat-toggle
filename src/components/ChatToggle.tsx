interface ChatToggleProps {
  isEnabled: boolean;
  preferredChat: 'youtube' | 'twitch';
  onToggle: () => void;
}

export function ChatToggle({ isEnabled, preferredChat, onToggle }: ChatToggleProps) {
  const isYouTube = preferredChat === 'youtube';

  return (
    <button
      className="ytp-button flex items-center justify-center p-2 hover:bg-white/10 rounded transition-colors"
      onClick={onToggle}
      title={`Switch to ${isYouTube ? 'Twitch' : 'YouTube'} chat`}
      aria-label={`Currently using ${preferredChat} chat. Click to switch to ${isYouTube ? 'Twitch' : 'YouTube'} chat.`}
    >
      <div className="relative flex items-center bg-white/10 rounded-full p-1 w-14 h-7 transition-colors">
        {/* YouTube label */}
        <span
          className={`absolute left-1.5 text-xs font-bold transition-colors z-10 ${
            isYouTube ? 'text-red-400' : 'text-white/60'
          }`}
        >
          YT
        </span>

        {/* Sliding indicator */}
        <div
          className={`absolute w-5 h-5 rounded-full transition-all duration-300 ease-in-out ${
            isYouTube
              ? 'translate-x-0 bg-red-500 shadow-lg shadow-red-500/25'
              : 'translate-x-7 bg-purple-500 shadow-lg shadow-purple-500/25'
          }`}
        />

        {/* Twitch label */}
        <span
          className={`absolute right-1.5 text-xs font-bold transition-colors z-10 ${
            !isYouTube ? 'text-purple-400' : 'text-white/60'
          }`}
        >
          TW
        </span>
      </div>

      {/* Optional status indicator */}
      {isEnabled && (
        <div className="ml-1">
          <div
            className={`w-2 h-2 rounded-full ${
              isYouTube ? 'bg-red-400' : 'bg-purple-400'
            } animate-pulse`}
          />
        </div>
      )}
    </button>
  );
}
