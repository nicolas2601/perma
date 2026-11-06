// UI-driven walk for flow views that route guards redirect when opened directly
// (in-memory image/context state). Runs on the production mock build (4174) and
// captures each step to shots/<view>.png. Unreached steps are logged, not faked.
import { chromium } from '@playwright/test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, 'shots');
const BASE = 'http://localhost:4174';
const SETTLE_MS = 2500;
const log = [];

const byName = (page, name) => page.getByRole('button', { name, exact: false }).first();

async function step(page, view, action, settleMs = SETTLE_MS) {
  try {
    await action();
    await page.waitForTimeout(settleMs);
    await page.screenshot({ path: join(SHOTS, `${view}.png`), fullPage: false, animations: 'disabled' });
    log.push({ view, ok: true, path: new URL(page.url()).pathname + new URL(page.url()).search });
  } catch (err) {
    log.push({ view, ok: false, error: String(err.message).split('\n')[0].slice(0, 200) });
  }
}

// Separate session: the camera route needs a granted/denied permission decision, which
// is independent from the file-based flow above.
async function runCameraSession(chromiumLauncher) {
  const browser = await chromiumLauncher.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    locale: 'es-CO', timezoneId: 'America/Bogota', serviceWorkers: 'block',
  });
  await context.route('**/*', (r) => (r.request().url().startsWith('http://localhost:') ? r.continue() : r.abort()));
  const page = await context.newPage();
  await page.goto(`${BASE}/contexto`, { waitUntil: 'load' });
  await step(page, 'contextFlowCheck', () => byName(page, 'Continuar a la imagen').click());
  await page.waitForTimeout(SETTLE_MS);
  await step(page, 'cameraPrimer', () => byName(page, 'Usar la cámara').click());
  await step(page, 'camera', () => byName(page, 'Continuar').click());
  await browser.close();
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    locale: 'es-CO', timezoneId: 'America/Bogota', serviceWorkers: 'block',
  });
  await context.route('**/*', (r) => (r.request().url().startsWith('http://localhost:') ? r.continue() : r.abort()));
  const page = await context.newPage();
  await page.goto(`${BASE}/contexto`, { waitUntil: 'load' });
  await step(page, 'context', async () => {});
  await step(page, 'contextDetails', () => byName(page, 'Contexto clínico opcional').click());
  await step(page, 'siteSheet', async () => { await page.keyboard.press('Escape'); await byName(page, 'Sitio del cuerpo').click(); });
  await page.keyboard.press('Escape');
  await step(page, 'capture', () => byName(page, 'Continuar a la imagen').click());
  await page.waitForTimeout(SETTLE_MS);
  await byName(page, 'Usar la cámara').click();
  await byName(page, 'Cancelar').click();
  await step(page, 'gallery', () => byName(page, 'Ejemplo de referencia pública').click());
  await step(page, 'quality', () => byName(page, 'Usar imagen de referencia').click());
  log.push({ view: 'qualityIssue', ok: false, error: 'sample is 600x443 (>=300 px): no low-resolution alert is reachable without a user file' });
  await step(page, 'consent', async () => {
    await byName(page, 'Revisar envío').click();
    await page.waitForTimeout(SETTLE_MS);
    await page.getByRole('checkbox').first().check();
  });
  // Mock 'slow' keeps the request pending (6-12 s); the scenario is read from location.search at send time.
  await page.evaluate(() => history.replaceState(null, '', `${location.pathname}?mock=slow`));
  await step(page, 'processing', () => byName(page, 'Enviar para análisis').click(), 400);
  await step(page, 'stopWaiting', () => byName(page, 'Detener espera').click(), 600);
  await browser.close();
  await runCameraSession(chromium);
  writeFileSync(join(HERE, 'flow-log.json'), JSON.stringify(log, null, 2));
  process.stdout.write(log.map((l) => `${l.view} ${l.ok ? 'OK ' + l.path : 'NOT ' + l.error}`).join('\n') + '\n');
}

run().catch((err) => { process.stderr.write(String(err.stack ?? err) + '\n'); process.exit(1); });
