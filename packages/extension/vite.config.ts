import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest-and-assets',
      closeBundle() {
        // Copy manifest.json to dist
        fs.copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        );

        // Ensure dist/content/content.css exists
        const contentCssSrc = resolve(__dirname, 'src/content/content.css');
        const contentCssDistDir = resolve(__dirname, 'dist/content');
        if (!fs.existsSync(contentCssDistDir)) {
          fs.mkdirSync(contentCssDistDir, { recursive: true });
        }
        fs.copyFileSync(contentCssSrc, resolve(contentCssDistDir, 'content.css'));
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel/index.html'),
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background/background.js';
          }
          if (chunkInfo.name === 'content') {
            return 'content/content.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
