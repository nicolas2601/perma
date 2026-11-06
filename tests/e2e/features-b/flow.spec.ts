import { expect, test } from '@playwright/test';

/**
 * Result -> viewer -> ABCDE -> compare -> summary -> export, seeded with the DEV-only
 * simulated result (`?seed=result`). Every step goes through the real exam reducer.
 */
test('result to export flow on simulated data', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/resultado?seed=result');
  await expect(page.getByRole('heading', { name: 'Salida experimental' })).toBeVisible();
  await expect(page.getByText('Modelo simulado').first()).toBeVisible();
  await expect(page.getByText(/No diagnostica\./).first()).toBeVisible();

  await page.getByRole('button', { name: 'Inspeccionar la imagen' }).click();
  await expect(page).toHaveURL(/\/inspeccion/);
  await expect(page.getByRole('tab', { name: 'Imagen' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('img', { name: /Imagen pública de referencia/ })).toBeVisible();

  await page.getByRole('button', { name: 'Registrar en ABCDE' }).click();
  await expect(page).toHaveURL(/\/examen\/abcde/);
  await page.getByRole('button', { name: /Asimetría/ }).click();
  await page.getByRole('radio', { name: 'Simétrica', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Simétrica', exact: true })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: 'Ver resumen' }).click();
  await expect(page).toHaveURL(/\/examen\/comparar/);
  await expect(page.getByRole('heading', { name: 'Compare con contexto.' })).toBeVisible();

  await page.getByRole('button', { name: 'Escribir nota profesional' }).click();
  await page.getByRole('textbox', { name: 'Nota profesional' }).fill('Control de prueba');
  await page.getByRole('button', { name: 'Guardar nota' }).click();
  await expect(page.getByText('Nota guardada.')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Revisar la sesión' }).click();
  await expect(page).toHaveURL(/\/revision$/);
  await page.getByRole('button', { name: 'Vista previa de exportación' }).click();
  await expect(page).toHaveURL(/\/revision\/exportar/);

  const exportButton = page.getByRole('button', { name: 'Descargar registro JSON' });
  await expect(exportButton).toBeDisabled();
  await page.getByRole('checkbox').check();
  await expect(exportButton).toBeEnabled();

  const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);
  expect(download.suggestedFilename()).toMatch(/^perma-.*\.json$/);
  await expect(page).toHaveURL(/\/revision\/exportada/);
  await expect(page.getByRole('heading', { name: 'Descarga iniciada.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/shots/flow-after-export.png' });
  expect(errors).toEqual([]);
});

/** Guard G10 sends `/resultado` to `/imagen`; the capture guard may forward that to `/contexto` without a site. */
test('direct result URL without a result leaves the result route', async ({ page }) => {
  await page.goto('/resultado');
  await expect(page).toHaveURL(/\/(imagen|contexto)$/);
});

test('confirmation page without a real export redirects to review', async ({ page }) => {
  await page.goto('/revision/exportada');
  await expect(page).toHaveURL(/\/revision$/);
});
