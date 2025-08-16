#!/usr/bin/env bun
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🔧 Building Chrome extension...');

// Read and modify manifest for dist
const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));

// Update paths to be relative to dist folder
manifest.content_scripts[0].js = ['content.js'];
manifest.background.service_worker = 'background.js';

// Write updated manifest
writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2));

// Show what files are included
console.log('\n📁 Files included in dist folder:');
function listFiles(dir: string, prefix = '') {
  const files = readdirSync(dir);
  files.forEach(file => {
    const filePath = join(dir, file);
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      console.log(`${prefix}📂 ${file}/`);
      listFiles(filePath, prefix + '  ');
    } else {
      console.log(`${prefix}📄 ${file}`);
    }
  });
}
listFiles('dist');

console.log('\n✅ Build complete! All files are in the dist/ folder');
console.log('📦 To package the extension:');
console.log('   • Run: bun run package');
console.log('   • Or manually zip the contents of the dist/ folder');
