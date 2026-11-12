import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

const API_ORIGIN = process.env.VITE_API_ORIGIN ?? 'https://derm.nicolasmoreno.site';

/** Preloads the Latin Geist subset (all Spanish accents live in it); other subsets stay lazy. */
function preloadLatinFont(): Plugin {
  return {
    name: 'perma:preload-latin-font',
    transformIndexHtml(_html, ctx) {
      const file = Object.keys(ctx.bundle ?? {}).find((name) => /geist-latin-wght-normal.*\.woff2$/.test(name));
      if (!file) return [];
      return [{ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' }, injectTo: 'head' }];
    },
  };
}

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: { '/api': { target: API_ORIGIN, changeOrigin: true, secure: true } } },
  // Same-origin /api for `vite preview` (LAN demos): the backend sends no CORS headers for other origins.
  preview: { proxy: { '/api': { target: API_ORIGIN, changeOrigin: true, secure: true } } },
  build: {
    target: 'es2023',
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'pdf-lib', test: /node_modules[\\/](pdf-lib|@pdf-lib|pako)/ }] },
      },
    },
  },
  plugins: [
    react(),
    preloadLatinFont(),
    // Self-signed HTTPS for LAN demos only: phones need a secure context for camera and service worker.
    ...(process.env.LAN_HTTPS === '1' ? [basicSsl()] : []),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,woff2,svg,webp,avif,png}'],
        globIgnores: ['**/geist-{cyrillic,cyrillic-ext,latin-ext,vietnamese}-*.woff2', '**/pdf-lib-*.js', '**/reference-tschandl-*.{webp,avif}'],
        runtimeCaching: [
          { urlPattern: /^\/api\//, handler: 'NetworkOnly' },
          { urlPattern: /\/assets\/pdf-lib-.*\.js$/, handler: 'CacheFirst', options: { cacheName: 'perma-pdf-lib' } },
        ],
      },
      manifest: {
        name: 'VERA', short_name: 'VERA', lang: 'es', display: 'standalone',
        background_color: '#f2f5f4', theme_color: '#006779', start_url: '/',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
