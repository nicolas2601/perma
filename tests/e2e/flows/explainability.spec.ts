import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { runToResult } from './support';

// Mock build (VITE_INFERENCE=mock). Mock analysis replays REAL captures only. Until captures for
// /api/analyze exist, the app must report the explainability layer as unavailable, not invent values.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SHOTS = path.join(REPO_ROOT, 'test-results', 'explainability');
const SWITCH_NAME = 'Ver delimitación de la lesión';
const NO_ENDPOINT_SWITCH = 'Esta versión del servidor no incluye la delimitación.';
const NO_ENDPOINT_ITA = 'Esta versión del servidor no incluye la fotometría.';

async function shot(page: Page, name: string): Promise<void> {
  const project = test.info().project.name;
  await page.screenshot({ path: path.join(SHOTS, `${project}-${name}.png`), fullPage: false });
}

test.describe('explainability layer (no captures yet: unavailable state)', () => {
  test('the contour switch is disabled with the endpoint reason and the image is never altered', async ({ page }) => {
    await runToResult(page);
    const toggle = page.getByRole('switch', { name: SWITCH_NAME });
    await expect(toggle).toBeDisabled();
    await expect(page.getByText(NO_ENDPOINT_SWITCH)).toBeVisible();
    await expect(page.locator('figure img').first()).toHaveCSS('filter', 'none');
    await shot(page, 'result-no-capture-switch');
  });

  test('the ITA card reports photometry as unavailable with its reason', async ({ page }) => {
    await runToResult(page);
    await expect(page.getByText(NO_ENDPOINT_ITA)).toBeVisible();
    await shot(page, 'result-no-capture-ita');
  });

  test('tone audit: Simular is disabled and explains that the mask is not stored', async ({ page }) => {
    await runToResult(page);
    await page.goto('/inspeccion?tab=auditoria');
    await expect(page.getByRole('button', { name: 'Simular' })).toBeDisabled();
    await expect(
      page.getByText('La máscara de esta imagen no está guardada. Vuelva a analizar la imagen para simular.'),
    ).toBeVisible();
    await shot(page, 'audit-no-capture');
  });

  // TODO(captures): enable once fixtures/api/analyze-MOCO_HAM7-*.json and simulate-tone-<delta>-*.json are captured
  // from the real v10.x models (public images only). Expected values must come from the capture, never from code.
  test.skip('contour overlay from the real capture aligns with the image (switch on)', async () => {});
  test.skip('ITA card shows the captured ITA with its category and decimal comma', async () => {});
  test.skip('tone audit before/after simulation replays the captured stop', async () => {});
});
