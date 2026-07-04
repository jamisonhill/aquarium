import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static-output build: everything is served as plain files, no server runtime.
// `base: './'` makes asset URLs relative so the site works from any path on the NAS.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    // Three.js is large; raise the warning limit rather than splitting the engine,
    // which would hurt startup on a LAN-served static site anyway.
    chunkSizeWarningLimit: 1200,
  },
});
