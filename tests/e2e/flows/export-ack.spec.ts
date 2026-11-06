import { expect, test, type Page } from '@playwright/test';
import { statSync } from 'node:fs';
import { COPY, chooseSample, openHome, runToResult, toCapture, toConsentChecked, toExportChecked, toReviewWithAbcde, switchLanguage } from './support';

const EXPORT_OPTIONS_LABEL = 'Opciones de exportación';
const PDF_OPTION_LABEL = 'PDF (resumen imprimible)';
const PDF_ACTION_LABEL = 'Descargar resumen PDF';

/** Opens the record from the exporting step: export -> compare -> ABCDE, changes criterion A, then back through the app. */
async function changeAbcdeFromExport(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Volver' }).first().click();
  await expect(page).toHaveURL(/\/revision$/);
  await page.getByRole('button', { name: 'Editar observaciones manuales' }).click();
  await expect(page).toHaveURL(/\/examen\/abcde$/);
  await page.getByRole('button', { name: /^Asimetría/ }).first().click();
  await page.getByRole('radio', { name: 'Asimétrica en dos ejes', exact: true }).click();
  await page.getByRole('button', { name: COPY.abcdeSummary }).click();
  await expect(page).toHaveURL(/\/examen\/comparar$/);
  await page.getByRole('button', { name: COPY.reviewSession }).click();
  await expect(page).toHaveURL(/\/revision$/);
  await page.getByRole('button', { name: COPY.exportPreview }).click();
  await expect(page).toHaveURL(/\/revision\/exportar$/);
}

test.describe('export acknowledgement and PDF download', () => {
  test('language switch keeps the acknowledgement; an ABCDE change clears it', async ({ page }) => {
    await openHome(page);
    await toCapture(page);
    await chooseSample(page);
    await toConsentChecked(page);
    await page.getByRole('button', { name: COPY.sendCta }).click();
    await expect(page).toHaveURL(/\/resultado$/, { timeout: 30_000 });
    await toReviewWithAbcde(page);
    await toExportChecked(page);

    await test.step('ES to EN to ES keeps the acknowledgement (no invalidation)', async () => {
      await switchLanguage(page, 'en');
      await expect(page.getByRole('checkbox', { name: /reviewed|revisado/i })).toBeChecked();
      await switchLanguage(page, 'es');
      await expect(page.getByRole('checkbox', { name: COPY.exportAck })).toBeChecked();
      await expect(page.getByRole('button', { name: COPY.exportJson })).toBeEnabled();
    });

    await test.step('changing an ABCDE value clears the acknowledgement (G5)', async () => {
      await changeAbcdeFromExport(page);
      await expect(page.getByRole('checkbox', { name: COPY.exportAck })).not.toBeChecked();
      await expect(page.getByRole('button', { name: COPY.exportJson })).toBeDisabled();
    });
  });

  test('PDF summary downloads a real non-empty PDF and only then acknowledges', async ({ page }) => {
    await runToResult(page);
    await toReviewWithAbcde(page);
    await toExportChecked(page);
    await page.getByRole('button', { name: EXPORT_OPTIONS_LABEL, exact: true }).click();
    await page.getByRole('radio', { name: PDF_OPTION_LABEL }).click();
    await expect(page.getByRole('radiogroup', { name: EXPORT_OPTIONS_LABEL })).toBeHidden();
    await expect(page.getByText('El PDF contiene el resumen imprimible del registro.')).toBeVisible();
    await expect(page).not.toHaveURL(/\/revision\/exportada$/);
    const [file] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: PDF_ACTION_LABEL }).click(),
    ]);
    expect(file.suggestedFilename()).toMatch(/\.pdf$/);
    const path = (await file.path()) as string;
    expect(statSync(path).size).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/revision\/exportada$/);
  });
});
