import { expect, test } from '@playwright/test';
import { COPY, chooseSample, openHome, previewImage, setMockQuery, toCapture, toConsentChecked } from './support';

const SLOW_MAX_MS = 12_000;
const LATE_RESPONSE_MARGIN_MS = 1_000;

test('Detener la espera keeps the image and a late response is discarded', async ({ page }) => {
  await openHome(page);
  await toCapture(page);
  await chooseSample(page);
  await toConsentChecked(page);
  await setMockQuery(page, 'slow');
  await page.getByRole('button', { name: COPY.sendCta }).click();
  await expect(page).toHaveURL(/\/envio\/procesando\?mock=slow$/);
  await page.getByRole('button', { name: COPY.stopWait }).click();
  await page.getByRole('button', { name: COPY.stopSheetConfirm, exact: true }).click();
  await expect(page).toHaveURL(/\/imagen\/calidad$/);
  await expect(previewImage(page)).toBeVisible();
  await page.waitForTimeout(SLOW_MAX_MS + LATE_RESPONSE_MARGIN_MS);
  await expect(page).toHaveURL(/\/imagen\/calidad$/);
  await expect(page.getByRole('heading', { name: 'Salida del modelo' })).toHaveCount(0);
});
