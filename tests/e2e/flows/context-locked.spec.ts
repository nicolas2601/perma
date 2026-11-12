import { expect, test } from '@playwright/test';
import { runToResult } from './support';

// An exam that already has an analysis keeps its context. The context screen must say so and offer a way out,
// instead of a silent no-op on "Continuar".
test('context screen explains the lock on an analysed exam and offers the result', async ({ page }) => {
  await runToResult(page);
  await page.goto('/contexto');
  await expect(page.getByText('Este examen ya tiene un análisis.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar a la imagen' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver el resultado' }).click();
  await expect(page).toHaveURL(/\/resultado$/);
});
