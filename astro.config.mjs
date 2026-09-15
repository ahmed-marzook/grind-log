import { defineConfig } from 'astro/config';
import icon from 'astro-icon';

// This is a GitHub Pages *project* site (served under /grind-log/, not at
// the domain root), so `base` must be set and every internal link/asset
// must go through it — see CLAUDE.md's "Hosting: GitHub Pages" section.
export default defineConfig({
  site: 'https://ahmed-marzook.github.io',
  base: '/grind-log/',
  // The deploy workflow re-passes `--base` from actions/configure-pages,
  // which omits the trailing slash. Astro only normalizes `base` to end
  // with "/" when trailingSlash is 'always' — without this, every link
  // built as `${base}${path}` (e.g. src/pages/index.astro) collapses to
  // things like "/grind-logahmed/" on the deployed build.
  trailingSlash: 'always',
  // Inlines Lucide icons as SVG at build time (via @iconify-json/lucide) —
  // no client JS, no icon font, no external request.
  integrations: [icon()],
});
