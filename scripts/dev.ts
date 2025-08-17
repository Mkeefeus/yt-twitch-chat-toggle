#!/usr/bin/env bun
import { spawn } from 'bun';

// Minimal subprocess interface used for Bun's spawn() return value
interface ProcessWithWait {
  kill(): void;
  wait(): Promise<{ exitCode?: number } | undefined>;
}

// start the SCSS watchers (this runs the watch-scss script inside Bun)
const scss = spawn({ cmd: ['bun', './scripts/watch-scss.ts'], stdout: 'inherit', stderr: 'inherit' });

// start tsc --watch
const tsc = spawn({ cmd: ['bun', 'run', 'tsc', '--', '--watch'], stdout: 'inherit', stderr: 'inherit' });

function shutdown(code = 0) {
  try { scss.kill(); } catch {}
  try { tsc.kill(); } catch {}
  // small delay to allow child processes to terminate
  setTimeout(() => process.exit(code), 50);
}

// Bun subprocesses expose a wait() promise that resolves with exit info
(scss as unknown as ProcessWithWait).wait().then((info) => {
  console.log('scss watcher exited', info);
  const exitCode = (info && typeof info.exitCode === 'number') ? info.exitCode : undefined;
  if (exitCode !== undefined && exitCode !== 0) shutdown(exitCode);
}).catch((err) => {
  console.error('scss watcher failed', err);
  shutdown(1);
});

(tsc as unknown as ProcessWithWait).wait().then((info) => {
  console.log('tsc watcher exited', info);
  const exitCode = (info && typeof info.exitCode === 'number') ? info.exitCode : undefined;
  if (exitCode !== undefined && exitCode !== 0) shutdown(exitCode);
}).catch((err) => {
  console.error('tsc watcher failed', err);
  shutdown(1);
});

// keep alive while watchers run
setInterval(() => {}, 1_000_000);
