import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        content: 'src/content/content.ts'
      },
      output: {
        entryFileNames: 'content.js',
        format: 'iife',
        assetFileNames: '[name].[ext]'
      }
    },
    emptyOutDir: false,
    outDir: 'dist/chrome'
  }
});
