import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  root: 'www',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: ['es2021', 'chrome97', 'safari13'],
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './www/src'),
    },
  },
});
