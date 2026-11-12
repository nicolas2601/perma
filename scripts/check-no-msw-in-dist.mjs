#!/usr/bin/env node
// Fails the build if MSW (mock service worker) code reached the production bundle.
// Usage: node scripts/check-no-msw-in-dist.mjs [distDir]
// Exit codes: 0 clean, 1 forbidden string found, 2 directory missing or unreadable (fails closed).

import { readdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXIT_CLEAN = 0;
export const EXIT_FOUND = 1;
export const EXIT_UNREADABLE = 2;

export const FORBIDDEN_PATTERNS = [
  { label: 'mockServiceWorker', pattern: /mockServiceWorker/ },
  { label: 'msw', pattern: /\bmsw\b/i },
  { label: 'setupWorker', pattern: /\bsetupWorker\b/ },
  { label: 'setupServer', pattern: /\bsetupServer\b/ },
];

const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.map', '.webmanifest', '.txt', '.svg']);

/** Returns the labels of every forbidden pattern found in one file's text. */
export function findForbiddenLabels(text) {
  return FORBIDDEN_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

/** Recursively lists text-like files under dir. Binary assets (woff2, png, avif) are skipped. */
export async function listTextFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return listTextFiles(full);
      return TEXT_EXTENSIONS.has(extname(entry.name)) ? [full] : [];
    }),
  );
  return nested.flat();
}

/** Scans dir and returns [{ file, labels }] for every file that contains a forbidden string. */
export async function scanDist(dir) {
  const files = await listTextFiles(dir);
  const hits = [];
  for (const file of files) {
    const labels = findForbiddenLabels(await readFile(file, 'utf8'));
    if (labels.length > 0) hits.push({ file, labels });
  }
  return hits;
}

async function main(argv) {
  const dir = resolve(argv[2] ?? 'dist');
  let hits;
  try {
    hits = await scanDist(dir);
  } catch (error) {
    console.error(`check-no-msw-in-dist: cannot read ${dir}: ${error.message}`);
    return EXIT_UNREADABLE;
  }
  if (hits.length === 0) {
    console.log(`check-no-msw-in-dist: OK, no MSW code in ${dir}`);
    return EXIT_CLEAN;
  }
  for (const { file, labels } of hits) {
    console.error(`check-no-msw-in-dist: forbidden [${labels.join(', ')}] in ${file}`);
  }
  return EXIT_FOUND;
}

const isEntrypoint = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  process.exitCode = await main(process.argv);
}
