#!/usr/bin/env bun
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { cpSync } from 'fs';

if (!existsSync('dist')) mkdirSync('dist', { recursive: true });

const files = [
  'manifest.json',
  'popup.html',
  'prompt.html',
  'popup.css',
  'prompt.css',
  'styles.css'
];

for (const f of files) {
  copyFileSync(`src/${f}`, `dist/${f}`);
  console.log(`Copied src/${f} -> dist/${f}`);
}

cpSync('src/icons', 'dist/icons', { recursive: true });
console.log('Copied src/icons -> dist/icons');
