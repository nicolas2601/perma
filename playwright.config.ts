import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';

type TestProject = NonNullable<PlaywrightTestConfig['projects']>[number];

interface Viewport {
  readonly width: number;
  readonly height: number;
}

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const E2E_OUT_DIR = 'dist-e2e';
const E2E_LOCALE = 'es-CO';
const E2E_TIMEZONE = 'America/Bogota';
const IS_CI = Boolean(process.env.CI);
const CI_RETRIES = 2;
const CI_WORKERS = 1;
const TEST_TIMEOUT_MS = 30_000; // slow mock scenario takes 6-12 s
const EXPECT_TIMEOUT_MS = 5_000;
const SERVER_TIMEOUT_MS = 180_000;
const MOBILE_DPR = 2;
const DESKTOP_DPR = 1;
const OFFLINE_SPECS = '**/offline/**';

const VIEWPORTS = {
  mobile320: { width: 320, height: 568 },
  mobile390: { width: 390, height: 844 },
  tablet768: { width: 768, height: 1024 },
  desktop1280: { width: 1280, height: 800 },
} satisfies Record<string, Viewport>;

// Chromium only. Device presets are not used on purpose: iPhone 13 in
// Playwright is 390x664 and defaults to WebKit, so the viewport is explicit.
function viewportProject(
  name: string,
  viewport: Viewport,
  touch: boolean,
  reducedMotion: 'reduce' | 'no-preference' = 'no-preference',
): TestProject {
  return {
    name,
    testIgnore: OFFLINE_SPECS,
    use: {
      viewport,
      isMobile: touch,
      hasTouch: touch,
      deviceScaleFactor: touch ? MOBILE_DPR : DESKTOP_DPR,
      reducedMotion,
    },
  };
}

const offlineProject: TestProject = {
  name: 'offline-sw',
  testMatch: OFFLINE_SPECS,
  use: {
    viewport: VIEWPORTS.mobile390,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: MOBILE_DPR,
    serviceWorkers: 'allow', // the only project where the SW under test is active
  },
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? CI_RETRIES : 0,
  workers: IS_CI ? CI_WORKERS : undefined,
  timeout: TEST_TIMEOUT_MS,
  expect: { timeout: EXPECT_TIMEOUT_MS },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: E2E_LOCALE,
    timezoneId: E2E_TIMEZONE,
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    viewportProject('mobile-320', VIEWPORTS.mobile320, true),
    viewportProject('mobile-390', VIEWPORTS.mobile390, true),
    viewportProject('mobile-390-reduced-motion', VIEWPORTS.mobile390, true, 'reduce'),
    viewportProject('tablet-768', VIEWPORTS.tablet768, true),
    viewportProject('desktop-1280', VIEWPORTS.desktop1280, false),
    offlineProject,
  ],
  // Mock inference is baked in at build time (VITE_INFERENCE is read by Vite),
  // so e2e never hits the shared research API. Output goes to dist-e2e so that
  // `npm run size` keeps measuring the live production build in dist/.
  webServer: {
    command: `VITE_INFERENCE=mock npx vite build --outDir ${E2E_OUT_DIR} && npx vite preview --outDir ${E2E_OUT_DIR} --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: SERVER_TIMEOUT_MS,
  },
});
