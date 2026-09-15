import { defineConfig } from 'astro/config';

// This is a GitHub Pages *project* site (served under /grind-log/, not at
// the domain root), so `base` must be set and every internal link/asset
// must go through it — see CLAUDE.md's "Hosting: GitHub Pages" section.
export default defineConfig({
  site: 'https://ahmed-marzook.github.io',
  base: '/grind-log',
});
