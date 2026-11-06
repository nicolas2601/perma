// Retrains the tiny blur logistic head on REAL-texture fixtures (non-clinical CC0 photographs), with a
// per-scene split: calib sources train, holdout sources choose the threshold, test sources score once.
// The R2 synthetic battery is an extra independent holdout. The head is written only if it passes the same
// acceptance gate the loader re-checks (passesAcceptanceGate). Otherwise nothing is written.
// Usage: node scripts/camera/train-real-texture-head.mjs --videos=/tmp/camera-bench/videos [--write]
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBattery } from '../bench/synthetic-battery.mjs';
import { loadCore } from './load-core.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...rest] = a.replace(/^--/, '').split('=');
  return [k, rest.length ? rest.join('=') : 'true'];
}));
const VIDEOS = resolve(args.videos ?? '/tmp/camera-bench/videos');
const MODEL_PATH = fileURLToPath(new URL('../../src/core/capture/model/camera-blur-model.json', import.meta.url));
const EDGE = 128;
const FRAME = EDGE * EDGE * 4;

/** Scenes whose correct label for the blur head is clear. Exposure and motion scenes are out of scope. */
const POSITIVE = new Set(['check-focus']);
const NEGATIVE = new Set(['none', 'closer', 'center-area', 'farther']);

async function featuresOf(core, path, label, set, scene) {
  const bytes = new Uint8Array(await readFile(path));
  const rows = [];
  for (let f = 0; f < bytes.length / FRAME; f++) {
    const rgba = new Uint8ClampedArray(bytes.buffer, bytes.byteOffset + f * FRAME, FRAME);
    const luma = core.luma.lumaOf({ width: EDGE, height: EDGE, rgba });
    rows.push({ x: core['blur-features'].extractBlurFeatures(luma, EDGE, EDGE), y: label, set, scene, frame: f });
  }
  return rows;
}

async function realTextureRows(core) {
  const rows = [];
  for (const name of (await readdir(VIDEOS)).filter(f => f.endsWith('.json')).sort()) {
    const truth = JSON.parse(await readFile(join(VIDEOS, name), 'utf8'));
    const label = POSITIVE.has(truth.expected) ? 1 : NEGATIVE.has(truth.expected) ? 0 : null;
    if (label === null) continue;
    if (truth.scenario === 'motionblur' || truth.scenario === 'steady-ae') continue;
    rows.push(...await featuresOf(core, join(VIDEOS, name.replace(/\.json$/, '.bin')), label, truth.set, `${truth.set}-${truth.scenario}`));
  }
  return rows;
}

/** Synthetic battery frames as an independent holdout: defocus and motion blur positive, sharp and dim negative. */
function batteryRows(core) {
  const rows = [];
  for (const frame of buildBattery({ edge: EDGE })) {
    const label = ['defocus', 'motion'].includes(frame.category) ? 1 : ['sharp', 'dim-visible'].includes(frame.category) ? 0 : null;
    if (label === null) continue;
    const luma = core.luma.lumaOf({ width: EDGE, height: EDGE, rgba: frame.rgba });
    rows.push({ x: core['blur-features'].extractBlurFeatures(luma, EDGE, EDGE), y: label, set: 'r2-battery', scene: frame.category });
  }
  return rows;
}

/** Logistic regression on z-scored features, class-balanced, L2 penalty, plain gradient descent. */
function train(rows, dims) {
  const mean = Array.from({ length: dims }, (_, j) => rows.reduce((s, r) => s + r.x[j], 0) / rows.length);
  const scale = Array.from({ length: dims }, (_, j) => {
    const sd = Math.sqrt(rows.reduce((s, r) => s + (r.x[j] - mean[j]) ** 2, 0) / rows.length);
    return sd > 1e-9 ? sd : 1;
  });
  const pos = rows.filter(r => r.y === 1).length;
  const neg = rows.length - pos;
  const weightOf = r => (r.y === 1 ? rows.length / (2 * pos) : rows.length / (2 * neg));
  const w = new Array(dims).fill(0);
  let b = 0;
  const lr = 0.2;
  const lambda = 0.01;
  for (let it = 0; it < 4000; it++) {
    const gw = new Array(dims).fill(0);
    let gb = 0;
    for (const r of rows) {
      const z = r.x.reduce((s, v, j) => s + w[j] * ((v - mean[j]) / scale[j]), b);
      const err = (1 / (1 + Math.exp(-z)) - r.y) * weightOf(r);
      for (let j = 0; j < dims; j++) gw[j] += err * ((r.x[j] - mean[j]) / scale[j]);
      gb += err;
    }
    for (let j = 0; j < dims; j++) w[j] -= lr * (gw[j] / rows.length + lambda * w[j]);
    b -= lr * gb / rows.length;
  }
  const lo = Array.from({ length: dims }, (_, j) => Math.min(...rows.map(r => r.x[j])));
  const hi = Array.from({ length: dims }, (_, j) => Math.max(...rows.map(r => r.x[j])));
  return { mean, scale, weights: w, bias: b, min: lo, max: hi };
}

function probability(model, x) {
  const z = x.reduce((s, v, j) => s + model.weights[j] * ((v - model.mean[j]) / model.scale[j]), model.bias);
  return 1 / (1 + Math.exp(-z));
}

const inRange = (model, x) => x.every((v, j) => v >= model.min[j] && v <= model.max[j]);

/** Rates on a split. Abstained frames (outside the training range) are reported, not counted as silence. */
function rates(model, rows, threshold) {
  const pos = rows.filter(r => r.y === 1);
  const neg = rows.filter(r => r.y === 0);
  const judged = rows.filter(r => inRange(model, r.x));
  const flag = r => probability(model, r.x) >= threshold;
  return {
    n: rows.length,
    recall: pos.length ? pos.filter(r => inRange(model, r.x) && flag(r)).length / pos.length : null,
    falseAlertRate: neg.length ? neg.filter(r => inRange(model, r.x) && flag(r)).length / neg.length : null,
    abstentionRate: rows.length ? 1 - judged.length / rows.length : null,
  };
}

/** Lowest threshold whose validation false-alert rate is at most the gate, so the threshold is not tuned on test. */
function chooseThreshold(model, validation, maxFalseAlert) {
  for (let t = 0.05; t <= 0.95; t += 0.01) {
    const value = Math.round(t * 100) / 100;
    if ((rates(model, validation, value).falseAlertRate ?? 0) <= maxFalseAlert) return value;
  }
  return 0.95;
}

async function main() {
  const { core, close } = await loadCore();
  try {
    const all = await realTextureRows(core);
    const trainRows = all.filter(r => r.set === 'calib');
    const validation = all.filter(r => r.set === 'holdout');
    const testRows = all.filter(r => r.set === 'test');
    const battery = batteryRows(core);
    const dims = trainRows[0].x.length;
    const model = train(trainRows, dims);
    const threshold = chooseThreshold(model, validation, 0.05);
    const testRates = rates(model, testRows, threshold);
    const batteryRates = rates(model, battery, threshold);
    const gate = {
      passed: testRates.recall >= 0.8 && testRates.falseAlertRate <= 0.05 && testRates.abstentionRate <= 0.1
        && batteryRates.recall >= 0.8 && batteryRates.falseAlertRate <= 0.05,
      minRecall: 0.8, maxFalseAlertRate: 0.05, maxAbstentionRate: 0.1,
    };
    const report = {
      split: { train: trainRows.length, validation: validation.length, test: testRows.length, battery: battery.length },
      threshold,
      validation: rates(model, validation, threshold),
      test: testRates,
      r2Battery: batteryRates,
      gate,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (args.write && gate.passed) {
      const json = {
        version: 2,
        scope: 'real-texture-blur-v1',
        features: dims,
        featureNames: ['laplacian-log-energy', 'fine-log-energy', 'medium-log-energy', 'coarse-log-energy', 'fine-over-medium', 'medium-over-coarse'],
        mean: model.mean, scale: model.scale, min: model.min, max: model.max, weights: model.weights, bias: model.bias,
        threshold,
        provenance: { generator: 'cc0-fixtures (scripts/camera/make-fixture-videos.py)', split: 'per-scene: calib/holdout/test' },
        acceptance: { passed: true, minRecall: 0.8, maxFalseAlertRate: 0.05, maxAbstentionRate: 0.1, test: testRates, battery: batteryRates },
      };
      await writeFile(MODEL_PATH, `${JSON.stringify(json, null, 2)}\n`);
      process.stdout.write(`wrote ${MODEL_PATH}\n`);
    } else if (args.write) {
      process.stdout.write('gate not passed: model NOT written (the shipped head stays disabled)\n');
    }
  } finally {
    await close();
  }
}

await main();
