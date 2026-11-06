// Summarises browser sweeps (run-harness.mjs output) into a per-scenario table: share of analysed frames whose
// raw candidate is the expected advice, share of hold-still, and share of any alert.
// Usage: node scripts/camera/summarize-runs.mjs --results=/tmp/camera-bench/results --before=before --after=after-final
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const RESULTS = resolve(args.results ?? '/tmp/camera-bench/results');

async function load(label) {
  const dir = join(RESULTS, label);
  const rows = new Map();
  for (const file of (await readdir(dir)).filter(f => f.endsWith('.json'))) {
    const { truth, candidates } = JSON.parse(await readFile(join(dir, file), 'utf8'));
    const n = candidates.length;
    const share = id => candidates.filter(c => c.candidate === id).length / n;
    rows.set(file.replace(/\.json$/, ''), {
      expected: truth.expected,
      analysed: n,
      expectedShare: share(truth.expected),
      holdStill: share('hold-still'),
      anyAlert: candidates.filter(c => c.candidate !== 'none').length / n,
      histogram: Object.fromEntries(Object.entries(candidates.reduce((acc, c) => {
        acc[c.candidate] = (acc[c.candidate] ?? 0) + 1;
        return acc;
      }, {})).map(([k, v]) => [k, Number((v / n).toFixed(3))])),
    });
  }
  return rows;
}

const pct = x => (x === undefined ? '-' : `${Math.round(x * 100)}%`);

async function main() {
  const before = args.before ? await load(args.before) : new Map();
  const after = await load(args.after ?? 'after-final');
  const names = [...new Set([...before.keys(), ...after.keys()])].sort();
  process.stdout.write('| fixture | expected | before: expected share | before: hold-still | before: any alert | after: expected share | after: hold-still | after: any alert |\n');
  process.stdout.write('|---|---|---|---|---|---|---|---|\n');
  for (const name of names) {
    const b = before.get(name);
    const a = after.get(name);
    process.stdout.write(`| ${name} | ${(a ?? b).expected} | ${pct(b?.expectedShare)} | ${pct(b?.holdStill)} | ${pct(b?.anyAlert)} | ${pct(a?.expectedShare)} | ${pct(a?.holdStill)} | ${pct(a?.anyAlert)} |\n`);
  }
  if (args.histograms) {
    for (const name of names) {
      const a = after.get(name);
      const b = before.get(name);
      process.stdout.write(`${name}\n  before ${JSON.stringify(b?.histogram ?? {})}\n  after  ${JSON.stringify(a?.histogram ?? {})}\n`);
    }
  }
}

await main();
