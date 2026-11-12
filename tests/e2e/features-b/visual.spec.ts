import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/** Each route is loaded with the DEV-only result seed (simulated output, no server call). */
const SHOT_DIR = path.join(process.cwd(), 'test-results', 'shots');
const SEED = 'seed=result';
const SETTLE_MS = 350;

function withSeed(route: string): string {
  return `${route}${route.includes('?') ? '&' : '?'}${SEED}`;
}

async function openSeeded(page: Page, route: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(withSeed(route));
  await page.waitForLoadState('networkidle');
  return errors;
}

async function shot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(SETTLE_MS);
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: false });
}

const PAGES: ReadonlyArray<readonly [string, string]> = [
  ['result', '/resultado'],
  ['classes', '/resultado/clases'],
  ['classDetail', '/resultado/clases/mel'],
  ['viewer-imagen', '/inspeccion?tab=imagen'],
  ['viewer-salida', '/inspeccion?tab=salida'],
  ['viewer-observaciones', '/inspeccion?tab=observaciones'],
  ['original', '/inspeccion/original'],
  ['zoom', '/inspeccion/zoom'],
  ['calibration', '/examen/calibracion'],
  ['calibrationReady', '/examen/calibracion/lista'],
  ['prior', '/examen/previo'],
  ['compare', '/examen/comparar'],
  ['summary', '/revision'],
  ['export', '/revision/exportar'],
  ['guide', '/guia'],
  ['privacy', '/guia/privacidad'],
];

for (const [name, route] of PAGES) {
  test(`shot ${name}`, async ({ page }) => {
    const errors = await openSeeded(page, route);
    await expect(page.locator('main')).toBeVisible();
    await shot(page, name);
    expect(errors).toEqual([]);
  });
}

test('shot modelDetails sheet', async ({ page }) => {
  const errors = await openSeeded(page, '/resultado');
  await page.getByRole('button', { name: 'Modelo y origen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, 'modelDetails');
  expect(errors).toEqual([]);
});

test('shot toolSheet', async ({ page }) => {
  const errors = await openSeeded(page, '/inspeccion?tab=imagen');
  await page.getByRole('button', { name: 'Info', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, 'toolSheet');
  expect(errors).toEqual([]);
});

test('shot notes sheet', async ({ page }) => {
  const errors = await openSeeded(page, '/examen/comparar');
  await page.getByRole('button', { name: 'Escribir nota profesional' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, 'notesSheet');
  expect(errors).toEqual([]);
});

test('shot exportOptions sheet', async ({ page }) => {
  const errors = await openSeeded(page, '/revision/exportar');
  await page.getByRole('button', { name: 'Opciones de exportación' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, 'exportOptions');
  expect(errors).toEqual([]);
});

test('shot abcde collapsed with values, then one expanded', async ({ page }) => {
  const errors = await openSeeded(page, '/examen/abcde');
  await page.getByRole('button', { name: /Asimetría/ }).click();
  await page.getByRole('radio', { name: 'Simétrica', exact: true }).click();
  await page.getByRole('button', { name: /Asimetría/ }).click();
  await page.getByRole('button', { name: /Borde/ }).click();
  await page.getByRole('radio', { name: 'Borde regular', exact: true }).click();
  await page.getByRole('button', { name: /Borde/ }).click();
  await shot(page, 'abcde-collapsed');
  await page.getByRole('button', { name: /Color/ }).click();
  await expect(page.getByRole('radio', { name: 'Un color', exact: true })).toBeVisible();
  await shot(page, 'abcde-expanded');
  expect(errors).toEqual([]);
});

test('export then acknowledgement page', async ({ page }) => {
  const errors = await openSeeded(page, '/revision/exportar');
  const exportButton = page.getByRole('button', { name: 'Descargar registro JSON' });
  await expect(exportButton).toBeDisabled();
  await page.getByRole('checkbox').check();
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  await expect(page).toHaveURL(/\/revision\/exportada/);
  await expect(page.getByRole('heading', { name: 'Se inició la descarga.' })).toBeVisible();
  await shot(page, 'exportDone');
  expect(errors).toEqual([]);
});
