// Usage: node scripts/qa/shots.mjs <baseUrl> <width> <height> <outDir>
// Captures the key routes (seeded with ?seed=result in dev) for visual QA and mobile regression diffs.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [, , base, width, height, outDir] = process.argv;
const ROUTES = [
  '/', '/contexto', '/imagen', '/imagen/muestras', '/imagen/calidad', '/envio',
  '/resultado?seed=result', '/resultado/clases?seed=result', '/inspeccion?seed=result',
  '/inspeccion/original?seed=result', '/examen/abcde?seed=result', '/examen/calibracion?seed=result',
  '/examen/comparar?seed=result', '/examen/previo?seed=result', '/revision?seed=result',
  '/revision/exportar?seed=result', '/guia', '/guia/privacidad',
  '/recuperacion/archivo', '/recuperacion/permiso', '/recuperacion/sin-conexion', '/recuperacion/servidor',
  '/recuperacion/tiempo', '/recuperacion/respuesta', '/recuperacion/limite', '/recuperacion/exportacion',
];
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +width, height: +height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const route of ROUTES) {
  await page.goto(base + route);
  await page.waitForTimeout(1200);
  const name = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';
  await page.screenshot({ path: `${outDir}/${name}.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) console.log('OVERFLOW', route, overflow);
}
console.log(`captured ${ROUTES.length} routes at ${width}x${height}; page errors: ${errors.length}`);
await browser.close();
