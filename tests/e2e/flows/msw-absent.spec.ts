import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { COPY, chooseSample, openHome, runToResult, toCapture, toConsentChecked } from './support';

const E2E_DIST = '/tmp/perma-dist-e2e';
const MSW_MARKERS = ['mockServiceWorker', 'setupWorker', 'setupServer'];

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

test('no mockServiceWorker request is made during the journey', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  await runToResult(page);
  expect(urls.filter((url) => url.includes('mockServiceWorker'))).toEqual([]);
});

test('the MSW worker file is not served as a worker script', async ({ page }) => {
  await openHome(page);
  const response = await page.request.get('/mockServiceWorker.js');
  const body = await response.text();
  const contentType = response.headers()['content-type'] ?? '';
  expect(contentType).not.toContain('javascript');
  for (const marker of MSW_MARKERS) expect(body).not.toContain(marker);
});

test('the production mock build bundle contains no MSW entry points', () => {
  const files = listFiles(E2E_DIST).filter((file) => /\.(js|html)$/.test(file));
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const marker of MSW_MARKERS) {
      expect(text.includes(marker), `${marker} found in ${file}`).toBe(false);
    }
  }
});

test('journey reaches consent without MSW handlers', async ({ page }) => {
  await openHome(page);
  await toCapture(page);
  await chooseSample(page);
  await toConsentChecked(page);
  await expect(page.getByRole('button', { name: COPY.sendCta })).toBeEnabled();
});
