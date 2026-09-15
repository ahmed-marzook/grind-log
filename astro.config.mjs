import { defineConfig } from 'astro/config';

// This is a GitHub Pages *project* site (served under /grind-log/, not at
// the domain root), so `base` must be set and every internal link/asset
// must go through it — see CLAUDE.md's "Hosting: GitHub Pages" section.
export default defineConfig({
  site: 'https://ahmed-marzook.github.io',
  // Trailing slash matters: import.meta.env.BASE_URL echoes `base` verbatim,
  // and every internal link across the app is built as `${base}${path}` —
  // without it, links collapse to things like "/grind-logahmed/".
  base: '/grind-log/',
});
