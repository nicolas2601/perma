// Measures the JS the browser needs before first render: entry script plus every
// modulepreload link in dist/index.html. size-limit globs cannot follow that graph.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const BUDGET_BYTES = 170 * 1000;
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const refs = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
const unique = [...new Set(refs)];
if (unique.length === 0) {
  console.error('No initial JS found in index.html');
  process.exit(2);
}
let total = 0;
for (const ref of unique) {
  const size = gzipSync(readFileSync(join(DIST, ref)), { level: 9 }).length;
  total += size;
  console.log(`${(size / 1000).toFixed(2).padStart(8)} kB gzip  ${ref}`);
}
console.log(`${(total / 1000).toFixed(2).padStart(8)} kB gzip  TOTAL initial JS (budget ${BUDGET_BYTES / 1000} kB)`);
process.exit(total > BUDGET_BYTES ? 1 : 0);
