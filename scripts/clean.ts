#!/usr/bin/env bun
import { rmSync } from 'fs';

const files = [
  'src/styles.css',
  'src/styles.css.map',
  'src/popup.css',
  'src/popup.css.map',
  'src/prompt.css',
  'src/prompt.css.map'
] as const;

for (const f of files) {
  try {
    rmSync(f, { force: true });
    console.log(`Removed ${f}`);
  } catch {
    // ignore
  }
}
