import { defineConfig } from 'vite';

// Relative base so the built site works from any folder (GitHub Pages project sites included).
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
});
