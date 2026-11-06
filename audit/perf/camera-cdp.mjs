// Chromium + CDP CPU throttling 4x on the live camera route with a fake camera.
// Records real advisor (guide worker) message rate and inter-message interval p95.
// Usage: node audit/perf/camera-cdp.mjs <url>
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4176';
const RUN_MS = 15000;
const THROTTLE = Number(process.env.THROTTLE ?? 4);

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--no-sandbox'],
});
const context = await browser.newContext({ permissions: ['camera'], viewport: { width: 390, height: 844 } });

// Count messages arriving from any Worker (advisor analysis results) with timestamps.
await context.addInitScript(() => {
  window.__advice = [];
  const Native = window.Worker;
  window.Worker = class extends Native {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', () => window.__advice.push(performance.now()));
    }
  };
});

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

await page.goto(base + "/contexto", { waitUntil: "load" });
await page.getByRole("button", { name: /guardar|continuar|siguiente|save|next/i }).last().click();
await page.waitForURL(/\/imagen$/, { timeout: 15000 });
const entendido = page.getByRole("button", { name: /entendido/i });
if (await entendido.count()) await entendido.first().click();
console.error("capture buttons:", JSON.stringify(await page.getByRole("button").allInnerTexts()));
await page.getByRole("button", { name: /c[aá]mara|camera|en vivo|live/i }).first().click();
await page.getByRole("dialog").waitFor({ timeout: 10000 });
console.error("primer buttons:", JSON.stringify(await page.getByRole("dialog").getByRole("button").allInnerTexts()));
await page.getByRole("dialog").getByRole("button", { name: /continuar/i }).click();
await page.waitForURL(/\/imagen\/camara$/, { timeout: 15000 });
await page.waitForTimeout(RUN_MS);

const result = await page.evaluate(() => {
  const t = window.__advice;
  const intervals = t.slice(1).map((v, i) => v - t[i]);
  const sorted = [...intervals].sort((a, b) => a - b);
  const pct = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null);
  const span = t.length > 1 ? (t[t.length - 1] - t[0]) / 1000 : 0;
  return {
    finalUrl: location.pathname,
    hasVideo: !!document.querySelector('video'),
    advisorMessages: t.length,
    advisorFps: span > 0 ? +((t.length - 1) / span).toFixed(2) : null,
    intervalP50Ms: pct(0.5) === null ? null : +pct(0.5).toFixed(1),
    intervalP95Ms: pct(0.95) === null ? null : +pct(0.95).toFixed(1),
  };
});

console.log(JSON.stringify({ throttleRate: THROTTLE, runMs: RUN_MS, ...result }, null, 2));
await browser.close();
