import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [vue(), tailwindcss(), viteStaticCopy({
    targets: [
      {
        src: 'manifest.json',
        dest: "",
      },
      {
        src: './_locales',
        dest: "",
        rename: "_locales", // Copy the _locales folder
      },
      {
        src: './icons',
        dest: "",
      }
    ],
  }),
  ],
  build: {
    outDir: "./dist", // Specify the build output directory
    emptyOutDir: true, // Clear the output directory before each build
    chunkSizeWarningLimit: 1000, // Set a warning limit for chunk sizes
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

});