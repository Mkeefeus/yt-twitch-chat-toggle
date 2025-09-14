# TODO

- Setup destroy methods for workers where needed
- Add overlay chat prompt
- Nuke IPC worker, not needed
- Revisit popup, maybe drop preact? Seems overkill for a basic popup
- Handle multiple streams at once, each tab gets its own extension instance, but they are sharing storage for current_yt_channel. Maybe make an array or part of channelSettings.
  - That being said, this may not matter because the extension is only active on one tab at a time. Unless you were to change streams on multiple tabs very close together, which could trigger a race condition. Maybe tie current to navigationWorker and make it public?
- Setup logger worker and debug mode
- Firefox compatibility
