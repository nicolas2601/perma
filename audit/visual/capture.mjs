// Visual audit capture for the 48 Figma-mapped views (read-only on src/).
// Usage: node audit/visual/capture.mjs [all|extra]
// Ports: 4174 = production mock build (preview), 4175 = dev server (VITE_INFERENCE=mock, ?seed=result).
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, 'shots');
const EXTRA = join(HERE, 'shots', 'extra');
const PROD = 'http://localhost:4174';
const DEV = 'http://localhost:4175';
const MANIFEST = JSON.parse(readFileSync(join(HERE, '..', '..', 'docs', 'figma-manifest.json'), 'utf8'));
const RESULT_STATES = new Set(['result', 'inspecting', 'abcde', 'compare', 'exporting', 'exported']);
const FLOW_STATES = new Set(['contextSet', 'capturing', 'reviewing', 'consenting', 'processing']);
const DEV_ONLY_VIEWS = new Set(['tone']);
const CLASS_PARAM = 'mel';
const ONLY = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
const MOBILE = { width: 390, height: 844, dpr: 2 };
const EXTRA_SIZES = [
  { width: 768, height: 1024, dpr: 1, tag: 'tablet768' },
  { width: 1280, height: 800, dpr: 1, tag: 'desktop1280' },
  { width: 1440, height: 900, dpr: 1, tag: 'desktop1440' },
];
const EXTRA_VIEWS = new Set(['home', 'result', 'viewer', 'abcde']);
const SETTLE_MS = 2500;

function targetFor(entry) {
  const usesSeed = RESULT_STATES.has(entry.state) || FLOW_STATES.has(entry.state) || entry.view === 'abcdeSheet' || entry.view === 'homeArt';
  const base = DEV_ONLY_VIEWS.has(entry.view) || usesSeed ? DEV : PROD;
  const route = entry.route.replace(':clase', CLASS_PARAM);
  const seedQuery = base === DEV && usesSeed ? 'seed=result' : '';
  const sep = route.includes('?') ? '&' : '?';
  const suffix = seedQuery ? `${sep}${seedQuery}` : '';
  return { url: base + route + suffix, base, seeded: Boolean(seedQuery) };
}

function viewList() {
  const main = MANIFEST.views.map((v) => ({ view: v.view, state: v.state, route: v.route, ...targetFor(v) }));
  // Routes with extra query fields come from the manifest route string; de-dupe handled by view key.
  return main;
}

async function probe(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const sw = document.documentElement.scrollWidth;
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} L=${Math.round(r.left)} R=${Math.round(r.right)}`);
      }
      if (offenders.length >= 8) break;
    }
    return { viewport: vw, scrollWidth: sw, horizontalOverflow: sw > vw + 1, offenders };
  });
}

async function openPage(browser, spec, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dpr,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    serviceWorkers: 'block',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const log = { console: [], pageerror: [], blocked: [] };
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.console.push(`${m.type()}: ${m.text()}`.slice(0, 300)); });
  page.on('pageerror', (e) => log.pageerror.push(String(e.message).slice(0, 300)));
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://localhost:')) return route.continue();
    log.blocked.push(url.slice(0, 120));
    return route.abort();
  });
  return { context, page, log };
}

async function capture(browser, spec, vp, outDir, name) {
  const { context, page, log } = await openPage(browser, spec, vp);
  let status = null;
  try {
    const resp = await page.goto(spec.url, { waitUntil: 'load', timeout: 30000 });
    status = resp ? resp.status() : null;
    await page.waitForTimeout(SETTLE_MS);
    const finalPath = new URL(page.url()).pathname + new URL(page.url()).search;
    const metrics = await probe(page);
    mkdirSync(outDir, { recursive: true });
    const file = join(outDir, `${name}.png`);
    // Viewport-only: fullPage drops content inside overflow-y-auto containers (seen on /inspeccion).
    await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
    return { name, url: spec.url, finalPath, status, file, ...metrics, ...log, ok: true };
  } catch (err) {
    return { name, url: spec.url, ok: false, error: String(err.message).slice(0, 300), ...log };
  } finally {
    await context.close();
  }
}

async function main() {
  const mode = process.argv[2] ?? 'all';
  const browser = await chromium.launch({ headless: true });
  const results = [];
  if (mode === 'all') {
    for (const spec of viewList().filter((s) => !ONLY || ONLY.has(s.view))) {
      const r = await capture(browser, spec, MOBILE, SHOTS, spec.view);
      results.push({ kind: 'mobile390', seeded: spec.seeded, ...r });
      process.stdout.write(`${spec.view} -> ${r.ok ? r.finalPath + ' ' + r.status : 'ERR ' + r.error}\n`);
    }
  }
  for (const spec of viewList().filter((s) => EXTRA_VIEWS.has(s.view))) {
    for (const vp of EXTRA_SIZES) {
      const r = await capture(browser, spec, vp, EXTRA, `${spec.view}-${vp.tag}`);
      results.push({ kind: vp.tag, seeded: spec.seeded, ...r });
      process.stdout.write(`${spec.view}@${vp.tag} -> ${r.ok ? r.finalPath + ' overflow=' + r.horizontalOverflow : 'ERR ' + r.error}\n`);
    }
  }
  await browser.close();
  writeFileSync(join(HERE, 'capture-log.json'), JSON.stringify(results, null, 2));
  process.stdout.write(`done ${results.length} captures\n`);
}

main().catch((err) => { process.stderr.write(String(err.stack ?? err) + '\n'); process.exit(1); });
