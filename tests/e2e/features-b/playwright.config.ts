import { defineConfig } from '@playwright/test';

/**
 * Features-B visual and flow checks. Runs the Vite DEV server, because the
 * `?seed=result` shortcut exists only in dev builds (import.meta.env.DEV).
 * Headless Chromium, 390 px mobile viewport. Run from the repository root:
 *   npx playwright test -c tests/e2e/features-b/playwright.config.ts --project mobile-390
 */
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_TIMEOUT_MS = 60_000;
const SERVER_TIMEOUT_MS = 120_000;

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: TEST_TIMEOUT_MS,
  reporter: [['list']],
  outputDir: 'test-results/pw-features-b',
  use: {
    baseURL: BASE_URL,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'mobile-390',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: `VITE_INFERENCE=mock npx vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: SERVER_TIMEOUT_MS,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
