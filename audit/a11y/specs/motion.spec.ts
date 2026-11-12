import { test } from '@playwright/test';
import { loadViews, runLabel, viewUrl } from '../lib/views';
import { saveJson } from '../lib/save';
import { measureMotion, type MotionReport } from '../lib/inpage';

const SAMPLE_MS = 700;

test.describe('reduced motion: durations and transform motion', () => {
  for (const view of loadViews()) {
    test(`${view.view} reduced`, async ({ page }) => {
      if (runLabel() === 'mock' && view.view === 'tone') {
        test.skip(true, 'devOnly route, not in production build');
        return;
      }
      await page.goto(viewUrl(view), { waitUntil: 'load' });
      await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => undefined);
      // Sample during the first entry sequence, where motion would be most visible.
      await page.waitForTimeout(SAMPLE_MS);
      const report: MotionReport = await page.evaluate(measureMotion);
      const offenders = report.animations.filter(
        (a) => a.durationMs > 100 || a.transform || a.infinite,
      );
      saveJson(`motion/${view.view}.json`, {
        view: view.view,
        route: view.route,
        reducedMotionEmulated: report.reducedMotionMatches,
        longDeclaredTransitions: report.longDeclared,
        animationsSampled: report.animations.length,
        offenders,
      });
    });
  }
});
