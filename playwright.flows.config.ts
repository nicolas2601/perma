import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';

/**
 * Flow-level e2e config . Chromium only, headless,
 * CLI runner. Runs against a MOCK inference build served from /tmp so that the
 * shared research API is never called and production dist/ is untouched.
 */
const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));
const HERE = path.join(REPO_ROOT, 'test-results', 'flows');
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const E2E_OUT_DIR = '/tmp/perma-dist-e2e';
const LOCALE = 'es-CO';
const TIMEZONE = 'America/Bogota';
const TEST_TIMEOUT_MS = 60_000;
const EXPECT_TIMEOUT_MS = 8_000;
const SERVER_TIMEOUT_MS = 240_000;

type Project = NonNullable<PlaywrightTestConfig['projects']>[number];

// Fake camera so the live-camera path runs without hardware. Permission denial is
// driven by the app's `?mock=permission` fault, never by these flags.
const CHROMIUM_ARGS = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];

const mobile390: Project = {
  name: 'mobile-390',
  use: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    launchOptions: { args: CHROMIUM_ARGS },
  },
};

const desktop1280: Project = {
  name: 'desktop-1280',
  use: {
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    launchOptions: { args: CHROMIUM_ARGS },
  },
};

export default defineConfig({
  testDir: path.join(REPO_ROOT, 'tests', 'e2e', 'flows'),
  outputDir: path.join(HERE, 'test-results'),
  fullyParallel: false,
  workers: 2,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: TEST_TIMEOUT_MS,
  expect: { timeout: EXPECT_TIMEOUT_MS },
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(HERE, 'results.json') }],
    ['html', { outputFolder: path.join(HERE, 'playwright-report'), open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: LOCALE,
    timezoneId: TIMEZONE,
    // Flow specs block the SW for deterministic runs; the offline spec opts in with test.use.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [mobile390, desktop1280],
  webServer: {
    command: `VITE_INFERENCE=mock npx vite build --outDir ${E2E_OUT_DIR} --emptyOutDir && npx vite preview --outDir ${E2E_OUT_DIR} --port ${PORT} --strictPort`,
    cwd: REPO_ROOT,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: SERVER_TIMEOUT_MS,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
