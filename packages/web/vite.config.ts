import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve @carsai/shared to its source so we don't depend on a build step
      // during development. (For production builds, build @carsai/shared first.)
      '@carsai/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Proxy API requests to the Express backend at :3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Static uploads served by the backend
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          query: ['@tanstack/react-query'],
          charts: ['chart.js', 'react-chartjs-2'],
          editor: ['@monaco-editor/react'],
        },
      },
    },
  },
});
