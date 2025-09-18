# TODO

## Content Script

- Automatically swap to twitch chat after linking channel
- Update description in prompt

## Popup

- Remake : D
- Drop Tailwind and preact, use vanilla js and css

## Misc

- Nuke IPC worker, not needed
- Handle multiple streams at once, each tab gets its own extension instance, but they are sharing storage for current_yt_channel. Maybe make an array or part of channelSettings.
  - That being said, this may not matter because the extension is only active on one tab at a time. Unless you were to change streams on multiple tabs very close together, which could trigger a race condition. Maybe tie current to navigationWorker and make it public?
- Setup logger worker and debug mode
- Firefox compatibility
