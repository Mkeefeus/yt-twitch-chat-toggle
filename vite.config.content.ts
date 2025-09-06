import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        content: 'src/content.tsx',
      },
      output: {
        entryFileNames: 'content.js',
        format: 'iife',
        assetFileNames: '[name].[ext]'
      }
    },
    emptyOutDir: false,
    sourcemap: true,
    outDir: 'dist'
  }
});
