// vite.config.popup.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/popup',
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        serviceworker: resolve(__dirname, 'src/serviceworker/serviceworker.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: resolve(__dirname, 'dist/chrome'),
    emptyOutDir: true
  }
});
