// Per-frame cost of the worker analysis path (validation + measurement + rules), in Node.
// Usage: node scripts/camera/bench-timing.mjs [--repeats=N] [--edge=128]
// Node on this machine is not a phone and CPU throttling is NOT applied; numbers are a lower bound on phone cost.
import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { buildBattery } from '../bench/synthetic-battery.mjs';
import { loadCore } from './load-core.mjs';

const DEFAULT_REPEATS = 5;
const WARM_UP_PASSES = 1;
const PERCENT_50 = 0.5;
const PERCENT_95 = 0.95;
const SCENES = 10;
const round = (value, digits = 3) => Number(value.toFixed(digits));

function argValue(name, fallback) {
  const hit = process.argv.find(arg => arg.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ?? 0;
}

/** Times `run` over every frame, `repeats` times, after a warm-up. Returns ms statistics. */
function timeFrames(frames, run, repeats, targetFps) {
  for (let w = 0; w < WARM_UP_PASSES; w++) for (const frame of frames) run(frame);
  const samples = [];
  for (let r = 0; r < repeats; r++) {
    for (const frame of frames) {
      const t0 = performance.now();
      run(frame);
      samples.push(performance.now() - t0);
    }
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
  return {
    samples: samples.length,
    meanMs: round(mean),
    p50Ms: round(percentile(samples, PERCENT_50)),
    p95Ms: round(percentile(samples, PERCENT_95)),
    maxMs: round(samples[samples.length - 1] ?? 0),
    analysisFpsCeiling: round(1000 / mean, 1),
    fpsAtTarget: round(Math.min(targetFps, 1000 / percentile(samples, PERCENT_95)), 1),
  };
}

async function main() {
  const repeats = argValue('repeats', DEFAULT_REPEATS);
  const edge = argValue('edge', 128);
  const { core, close } = await loadCore();
  try {
    const frames = buildBattery({ edge, scenes: SCENES });
    const handler = core['worker-handler'].createWorkerHandler();
    let id = 0;
    const handle = frame => {
      const pixels = frame.rgba.slice().buffer;
      return handler({ kind: 'analyze', id: ++id, width: edge, height: edge, active: 'none', pixels });
    };
    const { FramePipeline } = core['frame-pipeline'];
    const { chooseCandidate } = core.rules;
    // Fresh pipeline per frame: unrelated battery frames must not be compared as motion.
    const measure = frame => chooseCandidate(new FramePipeline().analyze({ width: edge, height: edge, rgba: frame.rgba }), 'none');
    const report = {
      environment: { node: process.version, cpu: cpus()[0]?.model ?? 'unknown', cores: cpus().length, throttling: 'not applied' },
      edge,
      frames: frames.length,
      repeats,
      targetFps: core.constants.TARGET_FPS,
      deadlineMs: core.constants.DEADLINE_MS,
      workerPath: timeFrames(frames, handle, repeats, core.constants.TARGET_FPS),
      measurementOnly: timeFrames(frames, measure, repeats, core.constants.TARGET_FPS),
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await close();
  }
}

await main();
