import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Static `dist/` for Vercel, Render, and GitHub Pages.
 *
 * GitHub project pages live at https://<user>.github.io/<repo>/
 * so CI must set BASE_PATH=/gridwake/ (see deploy-pages.yml).
 * Root hosts (Vercel / Render) leave BASE_PATH unset (default `/`).
 */
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    target: ['es2020', 'safari15'],
    cssMinify: true,
    chunkSizeWarningLimit: 700,
  },
  plugins: [
    {
      name: 'pwa-start-url',
      closeBundle() {
        const file = resolve('dist/manifest.webmanifest');
        const manifest = JSON.parse(readFileSync(file, 'utf8'));
        const start = base === '/' ? './' : base.endsWith('/') ? base : `${base}/`;
        manifest.start_url = start;
        manifest.scope = start;
        manifest.id = start;
        writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
      },
    },
  ],
});
