// Runs the synthetic battery against the baseline (rules + blur LR) and the pure-CV arm.
// Usage: node scripts/bench/run-battery.mjs [--timing-repeats=N]
// Prints one JSON report to stdout. No network, no files written.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { performance } from 'node:perf_hooks'
import { cpus, totalmem } from 'node:os'
import { buildBattery, SPEC } from './synthetic-battery.mjs'
import { baselineAdvice, createBlurPredictor, pureCvAdvice } from './baseline-classifier.mjs'

const MODEL_URL = new URL('./baseline-model.json', import.meta.url)
const SCORE_EDGE = 128
const TIMING_EDGES = [128, 256]
const TIMING_SCENES = 10
const DEFAULT_REPEATS = 5
const PERCENT_50 = 0.5
const PERCENT_95 = 0.95
const round = (value, digits = 4) => Number(value.toFixed(digits))

function parseRepeats(argv) {
  const flag = argv.find(arg => arg.startsWith('--timing-repeats='))
  const value = flag ? Number(flag.split('=')[1]) : DEFAULT_REPEATS
  if (!Number.isInteger(value) || value < 1) throw new RangeError('Invalid --timing-repeats')
  return value
}

const emptyRow = expect => ({ n: 0, alerts: 0, correct: 0, abstained: 0, expect })

// Rows are keyed by "category" and "category#level" so the report has both views.
function runArm(frames, arm) {
  const rows = {}
  for (const spec of SPEC) rows[spec.name] = emptyRow(spec.expect)
  for (const frame of frames) {
    const { advice, abstained } = arm(frame)
    for (const key of [frame.category, `${frame.category}#${frame.level}`]) {
      rows[key] ??= emptyRow(frame.expect)
      const row = rows[key]
      row.n++
      if (advice !== 'center') row.alerts++
      if (advice === frame.expect) row.correct++
      if (abstained) row.abstained++
    }
  }
  return rows
}

const toRate = row => ({
  expect: row.expect, n: row.n, alertRate: round(row.alerts / row.n), correctAdviceRate: round(row.correct / row.n),
  abstentionRate: round(row.abstained / row.n),
})

function summarize(rows) {
  const categories = Object.entries(rows).filter(([key]) => !key.includes('#'))
  const sum = (key, filter = () => true) => categories.filter(([, row]) => filter(row)).reduce((acc, [, row]) => acc + row[key], 0)
  const isPositive = row => row.expect !== 'center'
  const positives = sum('n', isPositive)
  const negatives = sum('n', row => !isPositive(row))
  return {
    sensitivityAnyAlert: round(sum('alerts', isPositive) / positives),
    correctAdviceOnPositives: round(sum('correct', isPositive) / positives),
    falseAlertRateOnNegatives: round(sum('alerts', row => !isPositive(row)) / negatives),
    abstentionRateOnPositives: round(sum('abstained', isPositive) / positives),
    abstentionRateOnNegatives: round(sum('abstained', row => !isPositive(row)) / negatives),
    positives,
    negatives,
    perCategory: Object.fromEntries(categories.map(([name, row]) => [name, toRate(row)])),
    perCategoryLevel: Object.fromEntries(Object.entries(rows).filter(([key]) => key.includes('#')).map(([name, row]) => [name, toRate(row)])),
  }
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)]
}

function timeArm(frames, arm, repeats) {
  for (const frame of frames) arm(frame) // warm-up pass
  const samples = []
  for (let r = 0; r < repeats; r++) {
    for (const frame of frames) {
      const t0 = performance.now()
      arm(frame)
      samples.push(performance.now() - t0)
    }
  }
  samples.sort((a, b) => a - b)
  return { frames: frames.length, samples: samples.length, p50Ms: round(percentile(samples, PERCENT_50), 3), p95Ms: round(percentile(samples, PERCENT_95), 3) }
}

function modelWeight(raw) {
  return { bytesRaw: raw.length, bytesGzip: gzipSync(raw).length, weightsCount: raw.length ? JSON.parse(raw).weights.length : 0 }
}

function main() {
  const repeats = parseRepeats(process.argv.slice(2))
  const raw = readFileSync(MODEL_URL, 'utf8')
  const predictor = createBlurPredictor(JSON.parse(raw))
  const baseline = frame => baselineAdvice(frame.rgba, frame.edge, frame.edge, predictor)
  const pureCv = frame => pureCvAdvice(frame.rgba, frame.edge, frame.edge)

  const scoreFrames = buildBattery({ edge: SCORE_EDGE })
  const report = {
    environment: { node: process.version, cpu: cpus()[0]?.model ?? 'unknown', cores: cpus().length, memGiB: round(totalmem() / 2 ** 30, 1) },
    battery: { edge: SCORE_EDGE, frames: scoreFrames.length, categories: SPEC.length, scenesPerCategory: scoreFrames.length / SPEC.length / 3, seed: 20261105, timingRepeats: repeats },
    arms: {
      baseline: summarize(runArm(scoreFrames, baseline)),
      pureCv: summarize(runArm(scoreFrames, pureCv)),
    },
    timing: {},
    modelWeight: modelWeight(raw),
  }
  for (const edge of TIMING_EDGES) {
    const frames = buildBattery({ edge, scenes: TIMING_SCENES })
    report.timing[`e${edge}`] = {
      baseline: timeArm(frames, baseline, repeats),
      pureCv: timeArm(frames, pureCv, repeats),
    }
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main()
