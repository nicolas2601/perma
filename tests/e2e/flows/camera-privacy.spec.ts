import { expect, test } from '@playwright/test';
import { openHome, toCapture, uploadJpeg } from './support';

const GUIDE_SETTLE_MS = 4_000;
const PRIMER_CONTINUE = 'Continuar';

/** Instruments the page before any app code runs: network, fetch/XHR/beacon bodies, IndexedDB writes. */
const INSTRUMENT = `
  window.__privacy = { events: [] };
  const log = (kind, detail) => window.__privacy.events.push({ kind, detail });
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    log('fetch', String(typeof input === 'string' ? input : input.url) + ' body=' + (init && init.body ? typeof init.body : 'none'));
    return origFetch.apply(this, arguments);
  };
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) { log('xhr', 'body=' + (body ? typeof body : 'none')); return origSend.apply(this, arguments); };
  const origBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
  if (origBeacon) navigator.sendBeacon = function (url, data) { log('beacon', String(url)); return origBeacon(url, data); };
  for (const method of ['put', 'add']) {
    const orig = IDBObjectStore.prototype[method];
    IDBObjectStore.prototype[method] = function (value) {
      log('idb-' + method, this.name + ' value=' + (value && value.constructor ? value.constructor.name : typeof value));
      return orig.apply(this, arguments);
    };
  }
`;

test('camera guide makes no /api request, no upload, and stores no frame', async ({ page }) => {
  await page.addInitScript(INSTRUMENT);
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api')) apiRequests.push(request.url());
  });

  await openHome(page);
  await toCapture(page);
  await page.getByRole('button', { name: 'Usar la cámara' }).click();
  await page.getByRole('button', { name: PRIMER_CONTINUE, exact: true }).click();
  await expect(page).toHaveURL(/\/imagen\/camara$/);
  await expect(page.getByRole('button', { name: 'Capturar' })).toBeEnabled({ timeout: 15_000 });
  await page.waitForTimeout(GUIDE_SETTLE_MS);

  const readyState = await page.evaluate(() => (document.querySelector('video') as HTMLVideoElement | null)?.readyState ?? -1);
  expect(readyState, 'positive control: the camera stream is live').toBeGreaterThanOrEqual(2);

  const events = await page.evaluate(() => (window as unknown as { __privacy: { events: { kind: string; detail: string }[] } }).__privacy.events);
  expect(apiRequests, 'no request to /api during the camera advice').toEqual([]);
  expect(events.filter((event) => event.kind === 'fetch' || event.kind === 'xhr' || event.kind === 'beacon'), 'no network writes from the guide').toEqual([]);
  expect(events.filter((event) => event.kind.startsWith('idb-')), 'no frame written to IndexedDB').toEqual([]);
});

test('control: the instrumentation does record IndexedDB writes when the record changes', async ({ page }) => {
  await page.addInitScript(INSTRUMENT);
  await openHome(page);
  await toCapture(page);
  await uploadJpeg(page);
  await page.waitForTimeout(GUIDE_SETTLE_MS);
  const events = await page.evaluate(() => (window as unknown as { __privacy: { events: { kind: string; detail: string }[] } }).__privacy.events);
  expect(events.some((event) => event.kind.startsWith('idb-')), 'control: a record write is observed').toBe(true);
});
