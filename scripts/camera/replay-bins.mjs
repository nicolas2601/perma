// Offline replay of the capture advisor on the 128x128 analysis frames written by make-fixture-videos.py.
// Runs the same modules as the worker (FramePipeline, chooseCandidate) and the same AdvicePolicy, one frame
// every 100 ms (10 fps). Use it to diagnose and calibrate; the browser harness is the end-to-end check.
// Usage: node scripts/camera/replay-bins.mjs --dir=/tmp/camera-bench/videos [--sets=calib,holdout]
//        [--only=calib-sharp,...] [--features] [--out=/tmp/camera-bench/replay.json]
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadCore } from './load-core.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...rest] = a.replace(/^--/, '').split('=');
  return [k, rest.length ? rest.join('=') : 'true'];
}));
const DIR = resolve(args.dir ?? '/tmp/camera-bench/videos');
const EDGE = 128;
const FRAME_BYTES = EDGE * EDGE * 4;
const FRAME_MS = 100;
const ONLY = args.only ? new Set(args.only.split(',')) : null;
const SETS = args.sets ? args.sets.split(',') : null;

function stemsOf(files) {
  return files.filter(f => f.endsWith('.bin')).map(f => f.replace(/\.bin$/, ''))
    .filter(s => (!SETS || SETS.includes(s.split('-')[0])) && (!ONLY || ONLY.has(s)))
    .sort();
}

/** Replays one fixture: returns per-frame candidates, shown advice and (optionally) the readings. */
function replay(core, bytes, keepFeatures) {
  const { FramePipeline } = core['frame-pipeline'];
  const { RuleEngine } = core.rules;
  const { AdvicePolicy } = core['advice-policy'];
  const pipeline = new FramePipeline();
  const engine = new RuleEngine();
  const policy = new AdvicePolicy();
  const frames = bytes.length / FRAME_BYTES;
  const rows = [];
  for (let f = 0; f < frames; f++) {
    const rgba = new Uint8ClampedArray(bytes.buffer, bytes.byteOffset + f * FRAME_BYTES, FRAME_BYTES);
    const reading = pipeline.analyze({ width: EDGE, height: EDGE, rgba });
    const verdict = engine.observe(reading);
    const candidate = verdict.candidate;
    const changed = policy.observe(candidate, f * FRAME_MS);
    const row = { frame: f, t: f * FRAME_MS, candidate, shown: policy.current, status: verdict.status };
    if (changed !== null) row.changed = changed;
    if (keepFeatures) row.reading = { ...reading, blur: undefined };
    rows.push(row);
  }
  return rows;
}

function histogram(values) {
  const counts = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, Number((n / values.length).toFixed(3))]));
}

async function main() {
  const { core, close } = await loadCore();
  try {
    const stems = stemsOf(await readdir(DIR));
    const report = {};
    for (const stem of stems) {
      const bytes = new Uint8Array(await readFile(join(DIR, `${stem}.bin`)));
      const truth = JSON.parse(await readFile(join(DIR, `${stem}.json`), 'utf8'));
      const rows = replay(core, bytes, Boolean(args.features));
      report[stem] = {
        expected: truth.expected,
        frames: rows.length,
        rawCandidates: histogram(rows.map(r => r.candidate)),
        shownAdvice: histogram(rows.map(r => r.shown)),
        changes: rows.filter(r => r.changed).map(r => ({ frame: r.frame, advice: r.changed })),
        ...(args.features ? { rows } : {}),
      };
      const shown = report[stem].shownAdvice;
      process.stdout.write(`${stem.padEnd(24)} expected=${truth.expected.padEnd(12)} raw=${JSON.stringify(histogram(rows.map(r => r.candidate)))} shown=${JSON.stringify(shown)}\n`);
    }
    if (args.out) await writeFile(resolve(args.out), `${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await close();
  }
}

await main();
