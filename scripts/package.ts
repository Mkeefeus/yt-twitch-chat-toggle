#!/usr/bin/env bun
import AdmZip from 'adm-zip';
import { existsSync } from 'fs';

if (!existsSync('dist')) {
  console.error('dist folder not found. Run build first.');
  process.exit(1);
}

const zip = new AdmZip();
zip.addLocalFolder('dist');
zip.writeZip('yt-twitch-chat-toggle.zip');
console.log('Created yt-twitch-chat-toggle.zip');
