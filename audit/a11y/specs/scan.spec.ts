import { test, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loadViews, runLabel, viewUrl, type ManifestView } from '../lib/views';
import { saveJson, screenshotPath } from '../lib/save';
import {
  measureContrast,
  measureLiveRegions,
  measureReflow,
  measureTargets,
  type ContrastReport,
  type LiveRegion,
  type ReflowReport,
  type TargetReport,
} from '../lib/inpage';

const SETTLE_MS = 500;
const NETWORK_IDLE_MS = 4000;
const ZOOM_FACTOR = '2';
const TONE_VIEW = 'tone';

interface AxeSummary {
  readonly id: string;
  readonly impact: string | null | undefined;
  readonly help: string;
  readonly helpUrl: string;
  readonly nodes: number;
  readonly sampleTargets: string[];
  readonly sampleSummary: string;
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_MS }).catch(() => undefined);
  await page.waitForTimeout(SETTLE_MS);
}

async function runAxe(page: Page): Promise<AxeSummary[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  return result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.length,
    sampleTargets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
    sampleSummary: (v.nodes[0]?.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 260),
  }));
}

async function zoomedReflow(page: Page): Promise<ReflowReport> {
  // Emulates 200% browser zoom with CSS zoom on <html>; not identical to browser zoom
  // (media queries are not re-evaluated), so the result is reported as emulated.
  await page.evaluate((z) => {
    document.documentElement.style.zoom = z;
  }, ZOOM_FACTOR);
  await page.waitForTimeout(SETTLE_MS);
  const report = await page.evaluate(measureReflow);
  await page.evaluate(() => {
    document.documentElement.style.zoom = '';
  });
  return report;
}

test.describe('scan: axe + layout per manifest view', () => {
  const views: ManifestView[] = loadViews();

  for (const view of views) {
    test(`${view.view}`, async ({ page }, info: TestInfo) => {
      const vp = info.project.name;
      if (runLabel() === 'mock' && view.view === TONE_VIEW) {
        saveJson(`scan/${view.view}-${vp}.json`, {
          view: view.view,
          route: view.route,
          status: 'NOT_IN_PRODUCTION_BUILD',
          note: 'Route is devOnly (src/features/guide/routes.tsx) and is excluded from the production bundle.',
        });
        test.skip(true, 'devOnly route, not in production build');
        return;
      }

      const url = viewUrl(view);
      const pageErrors: string[] = [];
      page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));
      const response = await page.goto(url, { waitUntil: 'load' });
      await settle(page);

      const finalPath = new URL(page.url()).pathname + new URL(page.url()).search;
      const meta = await page.evaluate(() => ({
        htmlLang: document.documentElement.lang,
        colorSchemeMeta: document.querySelector('meta[name="color-scheme"]')?.getAttribute('content') ?? null,
        colorSchemeCss: getComputedStyle(document.documentElement).colorScheme,
        h1: [...document.querySelectorAll('h1')].map((h) => (h.textContent ?? '').trim()).slice(0, 2),
        main: document.querySelectorAll('main').length,
        title: document.title,
      }));

      const axe = await runAxe(page);
      const targets: TargetReport = await page.evaluate(measureTargets);
      const contrast: ContrastReport = await page.evaluate(measureContrast);
      const reflow: ReflowReport = await page.evaluate(measureReflow);
      const live: LiveRegion[] = await page.evaluate(measureLiveRegions);
      const zoom2 = await zoomedReflow(page);

      await page.screenshot({
        path: screenshotPath(`${view.view}-${vp}.png`),
        fullPage: true,
      });

      saveJson(`scan/${view.view}-${vp}.json`, {
        view: view.view,
        nodeId: view.nodeId,
        phase: view.phase,
        manifestState: view.state,
        requestedUrl: url,
        finalPath,
        httpStatus: response?.status() ?? null,
        viewport: vp,
        meta,
        axe,
        targets,
        contrast,
        reflow,
        zoom200Emulated: zoom2,
        liveRegions: live,
        pageErrors,
        screenshot: `screenshots/${runLabel()}/${view.view}-${vp}.png`,
      });
    });
  }
});
