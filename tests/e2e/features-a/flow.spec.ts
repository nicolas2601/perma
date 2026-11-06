import { expect, test } from '@playwright/test';

/**
 * Home -> context -> capture (public sample) -> quality -> consent, then the mock
 * request runs and leaves the processing screen. The e2e build bakes VITE_INFERENCE=mock.
 */
test.describe('features-A flow', () => {
  test('reaches consent through the public sample and clears processing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Empiece con contexto.' })).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo examen' }).click();
    await expect(page).toHaveURL(/\/contexto$/);

    await page.getByRole('button', { name: 'Continuar a la imagen' }).click();
    await expect(page).toHaveURL(/\/imagen$/);

    await page.getByRole('button', { name: 'Usar ejemplo de referencia pública' }).click();
    await expect(page).toHaveURL(/\/imagen\/calidad$/);
    const review = page.getByRole('button', { name: 'Revisar envío' });
    await expect(review).toBeEnabled();
    await review.click();

    await expect(page).toHaveURL(/\/envio$/);
    const send = page.getByRole('button', { name: 'Enviar para análisis' });
    await expect(send).toBeDisabled();
    await page.getByRole('checkbox', { name: 'Tengo autorización para enviar esta imagen.' }).check();
    await expect(send).toBeEnabled();
    await send.click();

    await expect(page).toHaveURL(/\/envio\/procesando$/);
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/envio\/procesando$/, { timeout: 10_000 });
  });

  test('choosing another source discards the image and keeps the context', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Nuevo examen' }).click();
    await page.getByRole('button', { name: 'Continuar a la imagen' }).click();
    await page.getByRole('button', { name: 'Usar ejemplo de referencia pública' }).click();
    await expect(page).toHaveURL(/\/imagen\/calidad$/);
    await page.getByRole('button', { name: 'Elegir otra fuente' }).click();
    await expect(page).toHaveURL(/\/imagen$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Muestre la imagen.' })).toBeVisible();
  });

  test('a deep link to consent without context is redirected to the context screen', async ({ page }) => {
    await page.goto('/envio');
    await expect(page).toHaveURL(/\/contexto$/);
  });

  test('recovery pages announce the failure as an alert', async ({ page }) => {
    await page.goto('/recuperacion/limite');
    await expect(page.getByRole('alert')).toContainText('Se alcanzó el límite de solicitudes.');
  });
});
