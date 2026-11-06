import { defineConfig } from '@playwright/test';

// A11Y_BASE: 4171 = production-like mock build (preview); 4172 = dev server (DEV seed enabled).
// A11Y_RUN labels the output folder: "mock" or "dev".
const BASE = process.env.A11Y_BASE ?? 'http://localhost:4171';
const RUN = process.env.A11Y_RUN ?? 'mock';

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  fullyParallel: true,
  workers: 3,
  timeout: 120_000,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: `./results/${RUN}/playwright-report.json` }],
  ],
  use: {
    baseURL: BASE,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    serviceWorkers: 'block',
    screenshot: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'w390',
      testMatch: /(scan|keyboard|i18n)\.spec\.ts/,
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
    },
    {
      name: 'w320',
      testMatch: /scan\.spec\.ts/,
      use: { viewport: { width: 320, height: 568 }, deviceScaleFactor: 1 },
    },
    {
      name: 'w390-reduced',
      testMatch: /motion\.spec\.ts/,
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
      },
    },
  ],
});
