// Evaluates the deterministic capture rules (no blur head) on the R2 synthetic battery, one still frame per
// fixture held for ENTER_FRAMES + 1 readings (a rule needs its dwell to switch on). Inter-frame motion cannot be
// scored on a single-frame battery; see replay-bins.mjs for the sequence fixtures.
// Usage: node scripts/camera/evaluate-rules.mjs   (JSON report to stdout; writes nothing)
import { buildBattery, SPEC } from '../bench/synthetic-battery.mjs';
import { loadCore } from './load-core.mjs';

const EXPECTED_ADVICE = { center: 'none', dark: 'more-light', glare: 'avoid-glare', detail: 'check-focus' };
const EDGE = 128;
const round = (value, digits = 4) => Number(value.toFixed(digits));

function summarize(counts) {
  return Object.fromEntries(Object.entries(counts).map(([category, c]) => [category, {
    expect: c.expect,
    n: c.n,
    alertRate: round(c.alerts / c.n),
    correctAdviceRate: round(c.correct / c.n),
    advice: c.advice,
  }]));
}

function tally(counts, category, expect, advice) {
  const row = counts[category] ?? { expect, n: 0, alerts: 0, correct: 0, advice: {} };
  row.n++;
  if (advice !== 'none') row.alerts++;
  if (advice === EXPECTED_ADVICE[expect]) row.correct++;
  row.advice[advice] = (row.advice[advice] ?? 0) + 1;
  counts[category] = row;
}

async function main() {
  const { core, close } = await loadCore();
  try {
    const { FramePipeline } = core['frame-pipeline'];
    const { RuleEngine } = core.rules;
    const { ENTER_FRAMES } = core.constants;
    const counts = {};
    for (const frame of buildBattery({ edge: EDGE })) {
      const reading = new FramePipeline().analyze({ width: EDGE, height: EDGE, rgba: frame.rgba });
      const engine = new RuleEngine();
      let verdict = null;
      for (let i = 0; i <= ENTER_FRAMES; i++) verdict = engine.observe(reading);
      tally(counts, frame.category, frame.expect, verdict.candidate);
    }
    const perCategory = summarize(counts);
    const positives = SPEC.filter(s => s.expect !== 'center').map(s => s.name);
    const negatives = SPEC.filter(s => s.expect === 'center').map(s => s.name);
    const share = (names, key) => {
      const rows = names.map(n => perCategory[n]);
      const total = rows.reduce((s, r) => s + (r?.n ?? 0), 0);
      return round(rows.reduce((s, r) => s + (r?.[key] ?? 0) * (r?.n ?? 0), 0) / total);
    };
    const report = {
      edge: EDGE,
      note: 'Rules only (no blur head, no inter-frame motion). Single-frame battery, held for ENTER_FRAMES + 1 readings.',
      sensitivityAnyAlert: share(positives, 'alertRate'),
      falseAlertRateOnCleanFrames: share(negatives, 'alertRate'),
      correctAdviceOnPositives: share(positives, 'correctAdviceRate'),
      perCategory,
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    await close();
  }
}

await main();
