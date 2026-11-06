import { expect, test, type Page } from '@playwright/test';
import { COPY, chooseSample, openHome, previewImage, runToResult, setMockQuery, toCapture, toConsentChecked, toExportChecked, toReviewWithAbcde } from './support';

const OVERSIZED_BYTES = 10 * 1024 * 1024 + 1;
const NO_AUTO_RETRY_WAIT_MS = 3_000;

/** Reaches the consent step (sample image, consent ticked) and applies the mock fault before SEND. */
async function consentWithFault(page: Page, scenario: string): Promise<void> {
  await openHome(page);
  await toCapture(page);
  await chooseSample(page);
  await toConsentChecked(page);
  await setMockQuery(page, scenario);
  await page.getByRole('button', { name: COPY.sendCta }).click();
}

test.describe('recovery scenarios (provoked for real)', () => {
  test('permission: ?mock=permission denies the camera and returns to capture', async ({ page }) => {
    await openHome(page);
    await toCapture(page);
    await page.goto('/imagen/camara?mock=permission');
    await expect(page).toHaveURL(/\/recuperacion\/permiso$/);
    await expect(page.getByRole('heading', { name: 'El acceso a la cámara no está disponible.' })).toBeVisible();
    await page.getByRole('button', { name: 'Elegir un archivo de imagen' }).click();
    await expect(page).toHaveURL(/\/imagen$/);
  });

  test('file-unavailable: mock fault on the sample path returns to capture', async ({ page }) => {
    await openHome(page);
    await toCapture(page);
    await setMockQuery(page, 'file-unavailable');
    await page.getByRole('button', { name: COPY.sampleCta }).click();
    await expect(page).toHaveURL(/\/recuperacion\/archivo$/);
    await expect(page.getByRole('heading', { name: 'No se pudo abrir esta imagen.' })).toBeVisible();
    await page.getByRole('button', { name: 'Elegir otra imagen' }).click();
    await expect(page).toHaveURL(/\/imagen$/);
  });

  test('file-unavailable: a real non-image upload is rejected and recovered', async ({ page }) => {
    await openHome(page);
    await toCapture(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await expect(page).toHaveURL(/\/recuperacion\/archivo$/);
    await page.getByRole('button', { name: 'Elegir otra imagen' }).click();
    await expect(page).toHaveURL(/\/imagen$/);
  });

  test('file-unavailable: a real oversized upload (over 10 MiB) is rejected', async ({ page }) => {
    await openHome(page);
    await toCapture(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(OVERSIZED_BYTES),
    });
    await expect(page).toHaveURL(/\/recuperacion\/archivo$/);
  });

  const SERVER_SIDE: Array<{
    scenario: string;
    path: RegExp;
    title: string;
    primary: string;
    backTarget: RegExp;
  }> = [
    { scenario: 'server-error', path: /\/recuperacion\/servidor$/, title: 'No se recibió ningún resultado del análisis.', primary: 'Revise antes de reintentar', backTarget: /\/imagen\/calidad$/ },
    { scenario: 'timeout', path: /\/recuperacion\/tiempo$/, title: 'No se confirmó la finalización.', primary: 'Volver sin reenviar', backTarget: /\/imagen\/calidad$/ },
    { scenario: 'invalid-response', path: /\/recuperacion\/respuesta$/, title: 'La respuesta no se puede usar.', primary: 'Revisar contrato técnico', backTarget: /\/imagen\/calidad$/ },
    { scenario: 'rate-limit', path: /\/recuperacion\/limite$/, title: 'El servicio está limitando las solicitudes.', primary: 'Conservar la imagen y volver', backTarget: /\/imagen\/calidad$/ },
  ];

  for (const row of SERVER_SIDE) {
    test(`${row.scenario}: provoked from processing, returns to quality with the image kept`, async ({ page }) => {
      await consentWithFault(page, row.scenario);
      await expect(page).toHaveURL(row.path, { timeout: 30_000 });
      await expect(page.getByRole('heading', { name: row.title })).toBeVisible();
      await expect(page.getByText('Simulated', { exact: false })).toHaveCount(0);
      await page.getByRole('button', { name: row.primary }).click();
      await expect(page).toHaveURL(row.backTarget);
      await expect(previewImage(page)).toBeVisible();
    });
  }

  test('rate-limit: no automatic retry while the recovery page is shown', async ({ page }) => {
    await consentWithFault(page, 'rate-limit');
    await expect(page).toHaveURL(/\/recuperacion\/limite$/, { timeout: 30_000 });
    await page.waitForTimeout(NO_AUTO_RETRY_WAIT_MS);
    await expect(page).toHaveURL(/\/recuperacion\/limite$/);
  });

  test('export-unavailable: a blocked download routes to recovery, not to acknowledgement', async ({ page }) => {
    await page.addInitScript(() => {
      HTMLAnchorElement.prototype.click = function blockedDownload(): void {
        throw new Error('download blocked for the export-unavailable scenario');
      };
    });
    await runToResult(page);
    await toReviewWithAbcde(page);
    await toExportChecked(page);
    await page.getByRole('button', { name: COPY.exportJson }).click();
    await expect(page).toHaveURL(/\/recuperacion\/exportacion$/);
    await expect(page.getByRole('heading', { name: 'No se creó la exportación.' })).toBeVisible();
    await expect(page).not.toHaveURL(/\/revision\/exportada$/);
    await page.getByRole('button', { name: 'Volver a la vista previa de exportación' }).click();
    await expect(page).toHaveURL(/\/examen\/comparar$/);
  });
});
