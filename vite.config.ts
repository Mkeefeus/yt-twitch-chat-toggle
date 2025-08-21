// vite.config.popup.js
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: {
    target: 'ES2022',
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: 'popup.html'
    }
  }
});
