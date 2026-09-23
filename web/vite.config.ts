import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    // Lets phones reach the dev server by the Mac's Bonjour name (e.g. joosts-mac.local).
    allowedHosts: ['.local'],
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
