import { expect, test, type Page } from '@playwright/test';
import { COPY, chooseSample, dismissOfflineBanner, openHome, previewImage, toCapture, toConsentChecked } from './support';

// The production service worker must be active for these specs (the only spec family that allows it).
test.use({ serviceWorkers: 'allow' });

const OFFLINE_READY_ES = 'PERMA está lista para usarse sin conexión. El análisis de imágenes requiere conexión a la red.';
const OFFLINE_SEND_HEADING = 'No hay conexión para el análisis.';

/** First load installs the SW; reload once so the page is controlled by it (precache complete). */
async function activateServiceWorker(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: COPY.homeHeadline })).toBeVisible();
}

test.describe('offline shell with the production service worker', () => {
  test('service worker is registered, active and controlling the page', async ({ page }) => {
    await activateServiceWorker(page);
    const state = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return { scope: registration?.scope ?? null, active: registration?.active?.state ?? null, controlled: navigator.serviceWorker.controller !== null };
    });
    expect(state.scope).toContain('localhost:4173');
    expect(state.active).toBe('activated');
    expect(state.controlled).toBe(true);
  });

  test('offline navigation renders the shell and the offline notice', async ({ page, context }) => {
    await activateServiceWorker(page);
    await context.setOffline(true);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: COPY.homeHeadline })).toBeVisible();
    await expect(page.getByText(OFFLINE_READY_ES)).toBeVisible();
    await context.setOffline(false);
  });

  test('first install: the offline-ready banner does not cover the primary CTA while it is shown', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: COPY.dismissBanner })).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: COPY.newExam }).click();
    const cta = page.getByRole('button', { name: COPY.continueToImage });
    await expect(cta).toBeVisible();
    const covered = await cta.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit !== null && !el.contains(hit);
    });
    expect(covered, 'the offline-ready banner intercepts the primary CTA until dismissed').toBe(false);
    await dismissOfflineBanner(page);
  });

  test('offline SEND shows the offline recovery and keeps the image', async ({ page, context }) => {
    await activateServiceWorker(page);
    await openHome(page);
    await toCapture(page);
    await chooseSample(page);
    await toConsentChecked(page);
    await dismissOfflineBanner(page);
    await context.setOffline(true);
    await page.getByRole('button', { name: COPY.sendCta }).click();
    await expect(page).toHaveURL(/\/recuperacion\/sin-conexion$/);
    await expect(page.getByRole('heading', { name: OFFLINE_SEND_HEADING })).toBeVisible();
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Volver al envío' }).click();
    await expect(page).toHaveURL(/\/envio$/);
    await expect(previewImage(page)).toBeVisible();
  });
});
