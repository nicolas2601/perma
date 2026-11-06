// Reproducible training and acceptance gate for the blur head.
// Usage: node scripts/camera/train.mjs [--write] [--report=<path>]
// Without --write nothing is written. The gate thresholds below are fixed before any result is seen.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildBattery } from '../bench/synthetic-battery.mjs';
import { GENERATOR_ID, EDGE, mulberry, renderSceneFrames } from './generator.mjs';
import { loadCore } from './load-core.mjs';

const TRAIN_SEED = 51713;
const SCENES = 720;
const SPLIT_SHARE = { train: 0.6, val: 0.2 };
const SCENE_STRIDE = 104729;
const RANGE_MARGIN = 0.1;
const L2 = 1e-3;
const LEARNING_RATE = 0.5;
const ITERATIONS = 3000;
const GATE = { minRecall: 0.8, maxFalseAlertRate: 0.05, maxAbstentionRate: 0.1 };
const THRESHOLD_STEPS = 99;
const MODEL_PATH = fileURLToPath(new URL('../../src/core/capture/model/camera-blur-model.json', import.meta.url));
const BASELINE_PATH = fileURLToPath(new URL('../bench/baseline-model.json', import.meta.url));
const DATE = '2026-11-05';
const round = (value, digits = 4) => Number(value.toFixed(digits));

function splitScenes() {
  const rng = mulberry(TRAIN_SEED);
  const order = Array.from({ length: SCENES }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const trainEnd = Math.round(SCENES * SPLIT_SHARE.train);
  const valEnd = trainEnd + Math.round(SCENES * SPLIT_SHARE.val);
  const split = new Array(SCENES);
  order.forEach((scene, rank) => {
    split[scene] = rank < trainEnd ? 'train' : rank < valEnd ? 'val' : 'test';
  });
  return split;
}

function featuresOf(core, rgba, edge) {
  const frame = { width: edge, height: edge, rgba };
  return core['blur-features'].extractBlurFeatures(core.luma.lumaOf(frame), edge, edge);
}

function buildDataset(core, split) {
  const rows = [];
  for (let scene = 0; scene < SCENES; scene++) {
    const seed = TRAIN_SEED + scene * SCENE_STRIDE;
    for (const frame of renderSceneFrames(seed)) {
      rows.push({ scene, split: split[scene], kind: frame.kind, label: frame.label, features: featuresOf(core, frame.rgba, EDGE) });
    }
  }
  return rows;
}

function standardizer(rows) {
  const count = rows.length;
  const dims = rows[0].features.length;
  const mean = Array.from({ length: dims }, (_, d) => rows.reduce((s, r) => s + r.features[d], 0) / count);
  const scale = Array.from({ length: dims }, (_, d) => {
    const variance = rows.reduce((s, r) => s + (r.features[d] - mean[d]) ** 2, 0) / count;
    return Math.sqrt(variance) || 1;
  });
  return { mean, scale };
}

// Full-batch logistic regression, class-balanced, L2 on weights. Deterministic: no sampling.
function trainLogistic(rows, { mean, scale }) {
  const dims = mean.length;
  const positives = rows.filter(r => r.label === 1).length;
  const negatives = rows.length - positives;
  const data = rows.map(row => ({
    z: row.features.map((v, d) => (v - mean[d]) / scale[d]),
    label: row.label,
    weight: row.label === 1 ? 0.5 / positives : 0.5 / negatives,
  }));
  const w = new Array(dims).fill(0);
  let bias = 0;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const gradW = new Array(dims).fill(0);
    let gradB = 0;
    for (const { z, label, weight } of data) {
      const logit = bias + z.reduce((s, v, d) => s + v * (w[d] ?? 0), 0);
      const error = (1 / (1 + Math.exp(-logit)) - label) * weight;
      gradB += error;
      z.forEach((v, d) => { gradW[d] += error * v; });
    }
    bias -= LEARNING_RATE * gradB;
    for (let d = 0; d < dims; d++) w[d] -= LEARNING_RATE * ((gradW[d] ?? 0) + L2 * (w[d] ?? 0));
  }
  return { weights: w, bias };
}

function rangeOf(rows) {
  const dims = rows[0].features.length;
  const min = [];
  const max = [];
  for (let d = 0; d < dims; d++) {
    const values = rows.map(r => r.features[d]);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const margin = (high - low) * RANGE_MARGIN;
    min.push(low - margin);
    max.push(high + margin);
  }
  return { min, max };
}

/** Confusion at a threshold; abstained frames count as no alert (conservative for recall). */
function confusion(predictions, threshold) {
  let tp = 0;
  let fn = 0;
  let fp = 0;
  let tn = 0;
  let abstained = 0;
  for (const { label, prediction } of predictions) {
    if (prediction.abstained) abstained++;
    const alert = !prediction.abstained && prediction.probability >= threshold;
    if (label === 1 && alert) tp++;
    else if (label === 1) fn++;
    else if (alert) fp++;
    else tn++;
  }
  return { tp, fn, fp, tn, abstained, total: predictions.length };
}

const rates = c => ({
  recall: round(c.tp / (c.tp + c.fn)),
  falseAlertRate: round(c.fp / (c.fp + c.tn)),
  abstentionRate: round(c.abstained / c.total),
});

/** Lowest threshold whose validation false-alert rate meets the gate (maximizes recall under it). */
function chooseThreshold(validation) {
  const grid = Array.from({ length: THRESHOLD_STEPS }, (_, i) => (i + 1) / (THRESHOLD_STEPS + 1));
  const feasible = grid.filter(t => rates(confusion(validation, t)).falseAlertRate <= GATE.maxFalseAlertRate);
  if (feasible.length > 0) return feasible[0];
  return grid.reduce((best, t) => (rates(confusion(validation, t)).falseAlertRate < rates(confusion(validation, best)).falseAlertRate ? t : best));
}

function predictRows(predictor, rows) {
  return rows.map(row => ({ label: row.label, prediction: predictor.predict(row.features) }));
}

function batteryRows(core) {
  const frames = buildBattery({ edge: EDGE });
  const heads = { positives: ['defocus', 'motion'], negatives: ['sharp', 'dim-visible'] };
  return frames
    .filter(f => heads.positives.includes(f.category) || heads.negatives.includes(f.category))
    .map(f => ({ label: heads.positives.includes(f.category) ? 1 : 0, features: featuresOf(core, f.rgba, EDGE) }));
}

function parityGap(predictor, model, rows) {
  let gap = 0;
  for (const row of rows) {
    const logit = model.bias + row.features.reduce((s, v, d) => s + ((v - model.mean[d]) / model.scale[d]) * model.weights[d], 0);
    const naive = 1 / (1 + Math.exp(-logit));
    const inRange = row.features.every((v, d) => v >= model.min[d] && v <= model.max[d]);
    if (inRange) gap = Math.max(gap, Math.abs(naive - predictor.predict(row.features).probability));
  }
  return gap;
}

function baselineOnTest(testRows) {
  const base = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const predictions = testRows.map(row => {
    const inRange = row.features.every((v, d) => v >= base.min[d] && v <= base.max[d]);
    if (!inRange) return { label: row.label, prediction: { probability: 0, abstained: true } };
    const logit = base.bias + row.features.reduce((s, v, d) => s + ((v - base.mean[d]) / base.scale[d]) * base.weights[d], 0);
    return { label: row.label, prediction: { probability: 1 / (1 + Math.exp(-logit)), abstained: false } };
  });
  return rates(confusion(predictions, base.threshold));
}

/** Rates over frames the head judged (not abstained): shows discrimination separately from abstention. */
function judgedOnly(predictions, threshold) {
  const judged = predictions.filter(p => !p.prediction.abstained);
  const c = confusion(judged, threshold);
  return { judgedFrames: judged.length, recall: judged.length ? round(c.tp / (c.tp + c.fn) || 0) : null,
    falseAlertRate: judged.length ? round(c.fp / (c.fp + c.tn) || 0) : null };
}

function evaluateBattery(core, predictor, threshold) {
  const predictions = predictRows(predictor, batteryRows(core));
  const headOnly = rates(confusion(predictions, threshold));
  return { recall: headOnly.recall, falseAlertRate: headOnly.falseAlertRate, abstentionRate: headOnly.abstentionRate,
    frames: predictions.length, judged: judgedOnly(predictions, threshold) };
}

function buildModel({ mean, scale, weights, bias, min, max, threshold, test, battery, passed }) {
  return {
    version: 2,
    scope: 'synthetic-blur-only',
    features: 6,
    featureNames: ['laplacian-log-energy', 'fine-log-energy', 'medium-log-energy', 'coarse-log-energy', 'fine-over-medium', 'medium-over-coarse'],
    mean, scale, min, max, weights, bias, threshold,
    provenance: { generator: GENERATOR_ID, seed: TRAIN_SEED, scenes: SCENES, edge: EDGE, trainedOn: DATE, reproduce: 'node scripts/camera/train.mjs --write' },
    acceptance: {
      passed,
      minRecall: GATE.minRecall,
      maxFalseAlertRate: GATE.maxFalseAlertRate,
      maxAbstentionRate: GATE.maxAbstentionRate,
      test,
      battery: { recall: battery.recall, falseAlertRate: battery.falseAlertRate },
    },
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const reportArg = process.argv.find(a => a.startsWith('--report='));
  const { core, close } = await loadCore();
  try {
    const split = splitScenes();
    const rows = buildDataset(core, split);
    const train = rows.filter(r => r.split === 'train');
    const validation = rows.filter(r => r.split === 'val');
    const test = rows.filter(r => r.split === 'test');
    const std = standardizer(train);
    const logistic = trainLogistic(train, std);
    const range = rangeOf(train);
    const draft = { ...std, ...logistic, ...range };
    // Same weights, scale and range as the final model: predictions do not depend on threshold or acceptance.
    const predictor = core['blur-model'].createBlurPredictor({ ...draft, threshold: 0.5 });
    const threshold = chooseThreshold(predictRows(predictor, validation));
    const testRates = rates(confusion(predictRows(predictor, test), threshold));
    const battery = evaluateBattery(core, predictor, threshold);
    const passed = testRates.recall >= GATE.minRecall && testRates.falseAlertRate <= GATE.maxFalseAlertRate
      && testRates.abstentionRate <= GATE.maxAbstentionRate && battery.recall >= GATE.minRecall
      && battery.falseAlertRate <= GATE.maxFalseAlertRate;
    const final = buildModel({ ...draft, threshold, test: testRates, battery, passed });
    const loaderAgrees = core['blur-model'].passesAcceptanceGate(core['blur-model'].validateBlurModel(final)) === passed;
    const report = {
      generator: GENERATOR_ID, seed: TRAIN_SEED, scenes: SCENES, frames: rows.length,
      splitScenes: Object.fromEntries(['train', 'val', 'test'].map(s => [s, split.filter(x => x === s).length])),
      splitFrames: { train: train.length, val: validation.length, test: test.length },
      threshold: round(threshold, 2), gate: GATE, validationRates: rates(confusion(predictRows(predictor, validation), threshold)),
      testRates, battery,
      baselineHeadOnProceduralTest: baselineOnTest(test),
      parityMaxAbsGap: parityGap(predictor, final, test),
      loaderAgreesWithGate: loaderAgrees, passed,
    };
    const text = `${JSON.stringify(report, null, 2)}\n`;
    if (reportArg) writeFileSync(reportArg.split('=')[1], text);
    if (args.has('--write')) writeFileSync(MODEL_PATH, `${JSON.stringify(final, null, 2)}\n`);
    process.stdout.write(text);
  } finally {
    await close();
  }
}

await main();
