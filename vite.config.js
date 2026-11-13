import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import swPlugin from './vite-sw-plugin.js';

export default defineConfig({
  plugins: [react(), swPlugin()],
  server: {
    port: 8080,
    open: true
  }
});
