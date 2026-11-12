import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { COPY, runToResult } from './support';

// Mock build (VITE_INFERENCE=mock). Mock analysis replays the REAL v10.1.0 capture of the reference image.
// Expected values are read from the capture files, never typed here.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(REPO_ROOT, 'test-results', 'explainability');
const CAPTURES = path.join(REPO_ROOT, 'fixtures', 'api');
const SWITCH_NAME = 'Contorno de la lesión según el modelo';
const COPY_INSPECT = COPY.inspectImage;
const DETAILS_SUMMARY = 'Detalles técnicos (para investigación)';
const NOTE_FOR_AUDIT = 'Solo cambia la luminosidad de la piel alrededor de la lesión; la lesión no se modifica. Es una simulación para inspección.';

type Analyze = {
  segmentation: { image_width: number; image_height: number; contour: unknown[] };
  photometry: { ita_deg: number };
};

function capture<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(CAPTURES, name), 'utf8')) as T;
}

/** Spanish one-decimal format used by the app (e.g. 71.33 -> "71,3"). */
const esDecimal = (value: number): string => value.toFixed(1).replace('.', ',');

async function shot(page: Page, name: string): Promise<void> {
  const project = test.info().project.name;
  await page.screenshot({ path: path.join(SHOTS, `${project}-${name}.png`), fullPage: false });
}

test.describe('explainability layer on the real captured reference image', () => {
  test('the contour is off by default, draws over the untouched image when on, and the image is never filtered', async ({ page }) => {
    const analyze = capture<Analyze>('analyze-MOCO_HAM7-reference-tschandl-600.json');
    await runToResult(page);
    const toggle = page.getByRole('switch', { name: SWITCH_NAME });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    const original = page.locator('figure img').first();
    await expect(original).toHaveCSS('filter', 'none');
    const srcBefore = await original.getAttribute('src');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    // On mobile the result screen has no picture; the layer is drawn on the viewer that the result opens.
    await page.getByRole('button', { name: COPY_INSPECT }).click();
    // The desktop stage and the mobile panel both render the figure; assert the one that is on screen.
    const svg = page
      .locator(`svg[viewBox="0 0 ${analyze.segmentation.image_width} ${analyze.segmentation.image_height}"]`)
      .filter({ visible: true })
      .first();
    await expect(svg).toBeVisible();
    await expect(svg.locator('polygon').first()).toHaveAttribute('points', /\d/);
    await expect(page.locator('figure img').first()).toHaveCSS('filter', 'none');
    expect(await page.locator('figure img').first().getAttribute('src')).toBe(srcBefore);
    await shot(page, 'viewer-contour-on');
  });

  test('technical details hold the ITA with its category; the main result keeps no ITA card', async ({ page }) => {
    const analyze = capture<Analyze>('analyze-MOCO_HAM7-reference-tschandl-600.json');
    await runToResult(page);
    await expect(page.getByText(/ITA \d+,\d°/)).toBeHidden();
    await page.getByText(DETAILS_SUMMARY).click();
    await expect(page.getByText(`ITA ${esDecimal(analyze.photometry.ita_deg)}°`)).toBeVisible();
    await shot(page, 'result-technical-details');
  });

  test('luminance audit: a keyboard step is labelled, is not simulated until Simular, and shows the replayed before/after', async ({ page }) => {
    const analyze = capture<Analyze>('analyze-MOCO_HAM7-reference-tschandl-600.json');
    const tone = capture<{ photometry: { ita_deg: number } }>('simulate-tone--4.86-reference-tschandl-600.json');
    await runToResult(page);
    await page.goto('/inspeccion?tab=auditoria');
    const slider = page.getByRole('slider');
    await expect(slider).toBeVisible();
    await slider.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuetext', 'Más oscura (1 paso)');
    await expect(page.getByText('Simulación de luminosidad')).toHaveCount(0);
    await shot(page, 'audit-before-simulation');

    await page.getByRole('button', { name: 'Simular' }).click();
    await expect(page.getByText('Simulación de luminosidad')).toBeVisible();
    await expect(page.getByText(NOTE_FOR_AUDIT)).toBeVisible();
    await expect(page.getByText(`ITA antes: ${esDecimal(analyze.photometry.ita_deg)}°`)).toBeVisible();
    await expect(page.getByText(new RegExp(`ITA después: ${esDecimal(tone.photometry.ita_deg)}°`))).toBeVisible();
    await shot(page, 'audit-after-simulation');
  });

  test('phones: the audit Simular button sits above the bottom navigation at first render', async ({ page }) => {
    test.skip(test.info().project.name !== 'mobile-390', 'phone layout only');
    await runToResult(page);
    await page.goto('/inspeccion?tab=auditoria');
    // Initial render, no scrolling: the control must already sit above the bottom navigation.
    const simular = page.getByRole('button', { name: 'Simular' });
    await expect(simular).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Navegación principal' }).filter({ visible: true }).first();
    const button = await simular.boundingBox();
    const bar = await nav.boundingBox();
    expect(button && bar ? button.y + button.height <= bar.y : false).toBeTruthy();
  });

  test('the result shows the photo at a real size on mobile and the switch draws over it', async ({ page }) => {
    await runToResult(page);
    const photo = page.locator('figure img').first();
    await expect(photo).toBeVisible();
    const figure = photo.locator('xpath=ancestor::figure[1]');
    const box = await figure.boundingBox();
    // The real capture must not collapse: a flex column once shrank this figure to 0 px on phones.
    expect(box?.height ?? 0).toBeGreaterThan(150);
    await shot(page, 'result-figure-top');
    await page.getByRole('switch', { name: SWITCH_NAME }).click();
    await expect(page.locator('figure svg[viewBox] polygon').first()).toBeVisible();
  });
});
