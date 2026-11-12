import { expect, test, type Page } from '@playwright/test';

/**
 * Visual pass for the Features-A screens. Each shot is the 390 x 844 viewport, the same
 * frame size as the Figma screenshots, saved to test-results/shots/<name>.png.
 * Mock build only (VITE_INFERENCE=mock, baked by the e2e webServer). Reduced motion keeps
 * the entry sequence from changing the frame while it is captured.
 */

const SHOT_DIR = 'test-results/shots';
const SETTLE_MS = 900;
const SLOW_QUERY = '?mock=slow';

test.use({
  reducedMotion: 'reduce',
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
});

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: false });
}

async function toCapture(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nuevo examen' }).click();
  await expect(page).toHaveURL(/\/contexto$/);
  await page.getByRole('button', { name: 'Continuar a la imagen' }).click();
  await expect(page).toHaveURL(/\/imagen$/);
}

async function toQuality(page: Page): Promise<void> {
  await toCapture(page);
  await page.getByRole('button', { name: 'Usar ejemplo de referencia pública' }).click();
  await expect(page).toHaveURL(/\/imagen\/calidad$/);
  await expect(page.getByRole('button', { name: 'Revisar envío' })).toBeEnabled();
}

async function toConsent(page: Page): Promise<void> {
  await toQuality(page);
  await page.getByRole('button', { name: 'Revisar envío' }).click();
  await expect(page).toHaveURL(/\/envio$/);
}

test('home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Empiece con contexto.' })).toBeVisible();
  await shot(page, 'home');
});

test('context', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Nuevo examen' }).click();
  await expect(page).toHaveURL(/\/contexto$/);
  await shot(page, 'context');
});

test('capture', async ({ page }) => {
  await toCapture(page);
  await shot(page, 'capture');
});

test('camera', async ({ page }) => {
  await toCapture(page);
  await page.getByRole('button', { name: /Usar la cámara/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page).toHaveURL(/\/imagen\/camara$/);
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video !== null && video.readyState >= 2;
  });
  await shot(page, 'camera');
});

test('gallery', async ({ page }) => {
  await toCapture(page);
  await page.getByRole('button', { name: /Ejemplo de referencia pública/ }).click();
  await expect(page).toHaveURL(/\/imagen\/muestras$/);
  await shot(page, 'gallery');
});

test('quality', async ({ page }) => {
  await toQuality(page);
  await shot(page, 'quality');
});

test('consent', async ({ page }) => {
  await toConsent(page);
  await shot(page, 'consent');
});

test('processing', async ({ page }) => {
  // In-app navigation drops the query, so the slow scenario is set on the consent page
  // right before sending; the consent -> processing navigation carries it over.
  await toConsent(page);
  await page.evaluate((query) => window.history.replaceState(null, '', `${window.location.pathname}${query}`), SLOW_QUERY);
  await page.getByRole('checkbox', { name: 'Tengo autorización para enviar esta imagen.' }).check();
  await page.getByRole('button', { name: 'Enviar para análisis' }).click();
  await expect(page).toHaveURL(/\/envio\/procesando(\?.*)?$/);
  await shot(page, 'processing');
});

const RECOVERY_SHOTS: readonly (readonly [string, string])[] = [
  ['rec-file', '/recuperacion/archivo'],
  ['rec-permission', '/recuperacion/permiso'],
  ['rec-offline', '/recuperacion/sin-conexion'],
  ['rec-server', '/recuperacion/servidor'],
  ['rec-timeout', '/recuperacion/tiempo'],
  ['rec-contract', '/recuperacion/respuesta'],
  ['rec-rate', '/recuperacion/limite'],
  ['rec-export', '/recuperacion/exportacion'],
];

for (const [name, path] of RECOVERY_SHOTS) {
  test(name, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('alert')).toHaveCount(1);
    await shot(page, name);
  });
}
