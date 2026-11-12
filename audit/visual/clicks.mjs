// Click-through captures for views the direct route does not show (sheets/sub-screens).
// Writes shots/<view>.png (viewport 390x844 @2x). Reports which click target was missing.
import { chromium } from '@playwright/test';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const SHOTS = join(dirname(fileURLToPath(import.meta.url)), 'shots');
const steps = [
  { view: 'scope', url: 'http://localhost:4174/', clicks: ['Protocolo'] },
  { view: 'discard', url: 'http://localhost:4174/', clicks: ['Nuevo examen'] },
  { view: 'modelDetails', url: 'http://localhost:4175/resultado?seed=result', clicks: ['Modelo y procedencia'] },
  { view: 'exportOptions', url: 'http://localhost:4175/revision/exportar?seed=result', clicks: ['Opciones de exportación'] },
  { view: 'notesSheet', url: 'http://localhost:4175/examen/comparar?seed=result', clicks: ['Escribir nota profesional'] },
];
const browser = await chromium.launch({ headless: true });
for (const s of steps) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-CO', serviceWorkers: 'block' });
  await context.route('**/*', (r) => (r.request().url().startsWith('http://localhost:') ? r.continue() : r.abort()));
  const page = await context.newPage();
  try {
    await page.goto(s.url, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    for (const label of s.clicks) {
      await page.getByRole('button', { name: label, exact: false }).first().click({ timeout: 8000 });
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: join(SHOTS, `${s.view}.png`), fullPage: false, animations: 'disabled' });
    process.stdout.write(`${s.view} OK -> ${new URL(page.url()).pathname}\n`);
  } catch (err) {
    process.stdout.write(`${s.view} NOT: ${String(err.message).split('\n')[0].slice(0, 160)}\n`);
  }
  await context.close();
}
await browser.close();
