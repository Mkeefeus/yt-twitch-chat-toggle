#!/usr/bin/env bun
import { spawn } from 'bun';

const tasks = [
  ['sass', '--watch', 'src/styles/styles.scss:src/styles.css'],
  ['sass', '--watch', 'src/styles/popup.scss:src/popup.css'],
  ['sass', '--watch', 'src/styles/prompt.scss:src/prompt.css']
];

const procs = tasks.map((args) => {
  const p = spawn({
    cmd: args,
    stdout: 'inherit',
    stderr: 'inherit'
  });
  p.exited.then((code) => {
    console.log(`Process ${args.join(' ')} exited with ${code}`);
    // if any process exits non-zero, exit the parent
    if (code !== 0) process.exit(code ?? 1);
  });
  return p;
});

// keep the process alive
setInterval(() => {}, 1_000_000);
