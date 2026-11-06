import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

const API_ORIGIN = process.env.VITE_API_ORIGIN ?? 'https://derm.nicolasmoreno.site';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: { '/api': { target: API_ORIGIN, changeOrigin: true, secure: true } } },
  build: { target: 'es2023' },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,woff2,svg,webp,avif,png}'],
        globIgnores: ['**/geist-{cyrillic,cyrillic-ext,latin-ext,vietnamese}-*.woff2'],
        runtimeCaching: [{ urlPattern: /^\/api\//, handler: 'NetworkOnly' }],
      },
      manifest: {
        name: 'PERMA', short_name: 'PERMA', lang: 'es', display: 'standalone',
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
