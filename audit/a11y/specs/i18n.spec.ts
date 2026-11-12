import { test } from '@playwright/test';
import { runLabel, slugOf } from '../lib/views';
import { saveJson } from '../lib/save';
import { measureLiveRegions, type LiveRegion } from '../lib/inpage';

const SWITCH_ROUTES = ['/', '/contexto', '/resultado', '/inspeccion', '/examen/abcde', '/revision'];
const LIVE_ROUTES = ['/envio/procesando', '/recuperacion/servidor', '/recuperacion/sin-conexion', '/revision/exportada'];
const SEEDED = new Set(['/resultado', '/inspeccion', '/examen/abcde', '/revision']);
const SETTLE_MS = 400;

function urlFor(route: string): string {
  return runLabel() === 'dev' && SEEDED.has(route) ? `${route}?seed=result` : route;
}

interface LangSnapshot {
  readonly htmlLang: string;
  readonly title: string;
  readonly h1: string;
}

async function snapshot(page: import('@playwright/test').Page): Promise<LangSnapshot> {
  return page.evaluate(() => ({
    htmlLang: document.documentElement.lang,
    title: document.title,
    h1: (document.querySelector('h1')?.textContent ?? '').trim().slice(0, 80),
  }));
}

test.describe('language switch and live regions', () => {
  for (const route of SWITCH_ROUTES) {
    test(`ES/EN switch ${route}`, async ({ page }) => {
      await page.goto(urlFor(route), { waitUntil: 'load' });
      await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => undefined);
      await page.waitForTimeout(SETTLE_MS);
      const before = await snapshot(page);
      // Language switches carry lang="<target>" (desk AppShell and inspect Chrome).
      const control = page.locator('button[lang]').filter({ visible: true }).first();
      const found = await control.count();
      if (found === 0) {
        saveJson(`i18n/switch-${slugOf(route)}.json`, { route, switchFound: false, before });
        test.skip(true, 'no ES/EN switch on this route');
        return;
      }
      const target = await control.getAttribute('lang');
      const controlLabel = (await control.getAttribute('aria-label')) ?? (await control.textContent())?.trim() ?? '';
      await control.click();
      await page.waitForTimeout(SETTLE_MS);
      const after = await snapshot(page);
      saveJson(`i18n/switch-${slugOf(route)}.json`, {
        route,
        switchFound: true,
        controlLabel,
        switchTargetLang: target,
        before,
        after,
        documentLangUpdated: after.htmlLang === target,
        visibleTextChanged: before.h1 !== after.h1 || before.title !== after.title,
      });
    });
  }

  for (const route of LIVE_ROUTES) {
    test(`live regions ${route}`, async ({ page }) => {
      await page.goto(urlFor(route), { waitUntil: 'load' });
      await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => undefined);
      await page.waitForTimeout(SETTLE_MS);
      const regions: LiveRegion[] = await page.evaluate(measureLiveRegions);
      saveJson(`i18n/live-${slugOf(route)}.json`, { route, liveRegions: regions });
    });
  }
});
