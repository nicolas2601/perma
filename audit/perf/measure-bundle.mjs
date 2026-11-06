// Measures the initial JS graph of a Vite build: entry + static imports + modulepreload.
// Usage: node audit/perf/measure-bundle.mjs <distDir>
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname, posix } from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

const dist = resolve(process.argv[2] ?? 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const entry = [...html.matchAll(/<script type="module"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
const preload = [...html.matchAll(/<link rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);

const STATIC_IMPORT = /(?:^|[;\n}])\s*(?:import|export)\s[^'"`]*?from\s*["']([^"']+)["']|(?:^|[;\n}])\s*import\s*["']([^"']+)["']/g;

function staticDeps(file) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  for (const m of src.matchAll(STATIC_IMPORT)) {
    const spec = m[1] ?? m[2];
    if (spec.startsWith('.')) out.push(posix.normalize(posix.join(posix.dirname(file.slice(dist.length + 1)), spec)));
  }
  return out;
}

function rel(p) {
  return p.replace(/^\//, '');
}

const seen = new Set();
const queue = [...entry, ...preload].map(rel);
while (queue.length) {
  const f = queue.shift();
  if (seen.has(f)) continue;
  seen.add(f);
  const abs = join(dist, f);
  if (!f.endsWith('.js')) continue;
  for (const dep of staticDeps(abs)) queue.push(dep);
}

const kb = (n) => (n / 1000).toFixed(2);
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const br = (buf) =>
  brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;

let total = 0;
let totalBr = 0;
const rows = [];
for (const f of seen) {
  const buf = readFileSync(join(dist, f));
  const g = gz(buf);
  total += g;
  totalBr += br(buf);
  rows.push({ file: f, raw: buf.length, gzip: g });
}
rows.sort((a, b) => b.gzip - a.gzip);

console.log('INITIAL JS GRAPH (entry + static imports + modulepreload), file | raw KB | gzip KB');
for (const r of rows) console.log(`${r.file.padEnd(60)} ${kb(r.raw).padStart(9)} ${kb(r.gzip).padStart(9)}`);
console.log(`TOTAL initial JS gzip (level 9): ${total} bytes = ${kb(total)} kB (decimal) = ${(total / 1024).toFixed(2)} KiB`);
console.log(`TOTAL initial JS brotli q11 (reference only): ${totalBr} bytes = ${kb(totalBr)} kB`);
console.log(`Entry-only gzip (index-*.js, level 9): ${kb(gz(readFileSync(join(dist, rel(entry[0])))))} kB`);

// Every JS asset, to confirm which are lazy (not in the initial graph).
const all = [];
for (const f of readdirSync(join(dist, 'assets'))) {
  if (!f.endsWith('.js')) continue;
  const p = join(dist, 'assets', f);
  if (!statSync(p).isFile()) continue;
  const buf = readFileSync(p);
  all.push({ file: `assets/${f}`, gzip: gz(buf), lazy: !seen.has(`assets/${f}`) });
}
const lazy = all.filter((a) => a.lazy).sort((a, b) => b.gzip - a.gzip);
console.log(`\nLAZY JS (not in initial graph): ${lazy.length} chunks, ${kb(lazy.reduce((s, a) => s + a.gzip, 0))} kB gzip total`);
for (const a of lazy.slice(0, 40)) console.log(`  ${a.file.padEnd(55)} ${kb(a.gzip).padStart(9)} kB gzip`);
console.log(`\nALL JS: ${all.length} chunks`);
