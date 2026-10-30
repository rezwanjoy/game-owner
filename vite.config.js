import { defineConfig } from 'vite';

// Relative base so the build works from any folder (web portals, Capacitor).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
});
