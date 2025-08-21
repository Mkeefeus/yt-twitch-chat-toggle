import { defineConfig } from 'vite';
// import preact from '@preact/preset-vite';
// import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  // plugins: [preact(), tailwindcss()],
  build: {
    target: 'ES2022',
    outDir: 'dist',
    rollupOptions: {
      input: 'src/content.ts',
      output: {
        entryFileNames: 'content.js',
        format: 'iife'
      }
    }
  }
});
