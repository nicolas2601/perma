import { expect, test } from '@playwright/test';
import { COPY, dismissOfflineBanner, openHome, runToResult, toCapture, toConsentChecked, uploadJpeg } from './support';

const NOTE_TEXT = 'Nota persistida e2e';
/** Autosave is debounced by AUTOSAVE_DEBOUNCE_MS (800 ms); wait past it before reloading. */
const AUTOSAVE_SETTLE_MS = 1_500;
const ABCDE_OPTION = 'Asimétrica en un eje';

test('reload restores the record, the ABCDE value and the note from IndexedDB', async ({ page }) => {
  await openHome(page);
  await toCapture(page);
  await uploadJpeg(page);
  await toConsentChecked(page);
  await page.getByRole('button', { name: COPY.sendCta }).click();
  await expect(page).toHaveURL(/\/resultado$/, { timeout: 30_000 });
  await page.getByRole('button', { name: COPY.inspectImage }).click();
  await dismissOfflineBanner(page);
  await page.getByRole('button', { name: COPY.registerAbcde }).click();
  await page.getByRole('button', { name: /^Asimetría/ }).first().click();
  await page.getByRole('radio', { name: ABCDE_OPTION, exact: true }).click();
  await page.getByRole('button', { name: COPY.abcdeSummary }).click();
  await page.getByRole('button', { name: COPY.compareNote }).click();
  await page.getByRole('textbox', { name: 'Editar la nota profesional' }).fill(NOTE_TEXT);
  await page.getByRole('button', { name: 'Guardar nota' }).click();
  await expect(page.getByText('Nota guardada.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar' }).first().click();
  await page.waitForTimeout(AUTOSAVE_SETTLE_MS);

  await test.step('IndexedDB holds the ABCDE value and the note (perma-exam/exam/current)', async () => {
    const stored = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('perma-exam');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const snapshot = await new Promise<unknown>((resolve, reject) => {
        const request = db.transaction('exam', 'readonly').objectStore('exam').get('current');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return snapshot;
    });
    const serialized = JSON.stringify(stored);
    expect(serialized).toContain(NOTE_TEXT);
    expect(serialized).toMatch(/"abcde":\{"A":"[^"]+"/);
  });

  await page.reload();

  await test.step('the note survives the reload', async () => {
    await page.goto('/examen/comparar');
    await expect(page).toHaveURL(/\/examen\/comparar$/);
    await expect(page.getByText(NOTE_TEXT)).toBeVisible();
  });

  await test.step('the ABCDE value survives the reload (reached in-app from compare)', async () => {
    await page.getByRole('button', { name: 'Volver a la evolución' }).click();
    await expect(page).toHaveURL(/\/examen\/abcde$/);
    await expect(page.getByRole('button', { name: /^Asimetría/ }).first()).toContainText(ABCDE_OPTION);
  });
});

test('a page reload on the stage screens does not silently drop the record', async ({ page }) => {
  await runToResult(page);
  await page.reload();
  await expect(page).toHaveURL(/\/resultado$/);
  await expect(page.getByRole('button', { name: COPY.inspectImage })).toBeVisible();
});
