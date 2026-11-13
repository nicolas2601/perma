import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from './scripts/app-version';

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'jsdom', globals: true, include: ['tests/unit/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup.ts'] },
});
