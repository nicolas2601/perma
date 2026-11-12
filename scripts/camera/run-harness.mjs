// Drives the bench page in headless Chromium: one browser per fixture, the fixture is the fake camera feed.
// Needs the dev server: VITE_INFERENCE=mock npx vite --port 5212 --strictPort
// Usage: node scripts/camera/run-harness.mjs --label=before --videos=/tmp/camera-bench/videos --out=/tmp/camera-bench/results
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

/* global window */ // used inside page.waitForFunction / page.evaluate (browser context)

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const LABEL = args.label ?? 'run';
const VIDEOS = resolve(args.videos ?? '/tmp/camera-bench/videos');
const OUT = resolve(args.out ?? '/tmp/camera-bench/results', LABEL);
const BASE = args.base ?? 'http://localhost:5212';
const PAGE = `${BASE}/scripts/camera/harness/index.html`;
const CLIP_MS = 12_000;      // one fixture is 12 s (120 frames at 10 fps)
const SETTLE_MS = 2_500;     // camera start + worker load margin
const ONLY = args.only ? new Set(args.only.split(',')) : null;

async function runFixture(name) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${join(VIDEOS, `${name}.y4m`)}`,
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(PAGE);
    await page.waitForFunction(() => window.__harness?.ready === true, null, { timeout: 30_000 });
    await page.waitForTimeout(CLIP_MS + SETTLE_MS);
    const data = await page.evaluate(() => window.__harness);
    if (data.error) throw new Error(`${name}: ${data.error}`);
    if (errors.length) throw new Error(`${name}: page errors ${errors.join(' | ')}`);
    return data;
  } finally {
    await browser.close();
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const names = (await readdir(VIDEOS))
    .filter(f => f.endsWith('.y4m'))
    .map(f => f.replace(/\.y4m$/, ''))
    .filter(n => !ONLY || ONLY.has(n))
    .sort();
  for (const name of names) {
    const truth = JSON.parse(await readFile(join(VIDEOS, `${name}.json`), 'utf8'));
    const data = await runFixture(name);
    const candidates = data.candidates.filter(c => c.media < truth.frames / truth.fps);
    const advice = data.advice.filter(a => a.media < truth.frames / truth.fps);
    await writeFile(join(OUT, `${name}.json`), `${JSON.stringify({ truth, candidates, advice }, null, 2)}\n`);
    const histogram = {};
    for (const c of candidates) histogram[c.candidate] = (histogram[c.candidate] ?? 0) + 1;
    process.stdout.write(`${name.padEnd(22)} expected=${truth.expected.padEnd(12)} analyzed=${candidates.length} candidates=${JSON.stringify(histogram)}\n`);
  }
}

await main();
