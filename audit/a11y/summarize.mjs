// Aggregates per-run evidence JSON into results/summary-<run>.json and prints counts.
// Usage: node audit/a11y/summarize.mjs <mock|dev>
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'results');
const run = process.argv[2] ?? 'mock';
const dir = join(ROOT, run);
const SEVERITY_ORDER = ['critical', 'serious', 'moderate', 'minor'];

function loadDir(sub) {
  const path = join(dir, sub);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(path, f), 'utf8')));
}

const scans = loadDir('scan');
const axeByImpact = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0]));
const axeRows = [];
const contrastRows = [];
const targetRows = [];
const reflowRows = [];
const zoomRows = [];
const routeRows = [];
const errorRows = [];

for (const s of scans) {
  if (s.status === 'NOT_IN_PRODUCTION_BUILD') {
    routeRows.push({ view: s.view, viewport: 'all', note: s.status });
    continue;
  }
  const id = `${s.view}@${s.viewport}`;
  routeRows.push({ view: s.view, viewport: s.viewport, route: s.requestedUrl, finalPath: s.finalPath, status: s.httpStatus, h1: s.meta.h1[0] ?? '' });
  for (const v of s.axe) {
    axeByImpact[v.impact] = (axeByImpact[v.impact] ?? 0) + 1;
    axeRows.push({ id, rule: v.id, impact: v.impact, nodes: v.nodes, target: v.sampleTargets[0] ?? '', evidence: s.screenshot });
  }
  if (s.contrast.fails.length) {
    contrastRows.push({ id, fails: s.contrast.fails.length, worst: s.contrast.fails.sort((a, b) => a.ratio - b.ratio)[0], checked: s.contrast.checked, unverifiable: s.contrast.unverifiable });
  }
  const realSmall = s.targets.under24.filter((t) => !t.spacingExempt);
  if (realSmall.length) targetRows.push({ id, below24NotExempt: realSmall.length, sample: realSmall[0] });
  if (s.targets.under44Count) targetRows.push({ id, under44Advisory: s.targets.under44Count, advisory: true });
  if (s.reflow.overflowPx > 0) reflowRows.push({ id, overflowPx: s.reflow.overflowPx, clipped: s.reflow.clipped.slice(0, 3) });
  if (s.zoom200Emulated.overflowPx > 0) zoomRows.push({ id, overflowPx: s.zoom200Emulated.overflowPx, clipped: s.zoom200Emulated.clipped.slice(0, 3) });
  if (s.pageErrors.length) errorRows.push({ id, errors: s.pageErrors });
}

const keyboard = loadDir('keyboard');
const tabs = keyboard.filter((k) => k.tabPresses !== undefined);
const escapes = keyboard.filter((k) => k.triggersTested !== undefined);
const keyboardRows = tabs.map((t) => ({
  route: t.route,
  uniqueStops: t.uniqueStops,
  trapCandidates: t.trapCandidates.length,
  invisibleFocus: t.invisibleFocus.length,
  obscuredFocus: t.obscuredFocus.length,
  backwardJumps: t.backwardJumps.length,
  reachedEnd: t.reachedBrowserOrEnd,
}));
const escapeRows = escapes.flatMap((e) => e.results.map((r) => ({ route: e.route, ...r })));

const motion = loadDir('motion').map((m) => ({
  view: m.view,
  emulated: m.reducedMotionEmulated,
  offenders: m.offenders.length,
  sample: m.offenders[0] ?? null,
  longDeclared: m.longDeclaredTransitions.length,
}));

const i18nSwitch = loadDir('i18n').filter((r) => r.switchTargetLang !== undefined || r.switchFound === false);
const i18nRows = i18nSwitch.map((r) => ({ route: r.route, found: r.switchFound, target: r.switchTargetLang, docLangBefore: r.before?.htmlLang, docLangAfter: r.after?.htmlLang, documentLangUpdated: r.documentLangUpdated, visibleTextChanged: r.visibleTextChanged }));
const live = loadDir('i18n').filter((r) => r.liveRegions !== undefined).map((r) => ({ route: r.route, regions: r.liveRegions.length }));

const summary = {
  run,
  generatedAt: new Date().toISOString(),
  viewportViewCount: scans.length,
  axeViolationsByImpact: axeByImpact,
  axeRows,
  contrastRows,
  targetRows,
  reflowRows,
  zoomEmulatedRows: zoomRows,
  pageErrors: errorRows,
  routeRows,
  keyboardRows,
  escapeRows,
  motion,
  i18nRows,
  liveRegions: live,
};
const out = join(ROOT, `summary-${run}.json`);
writeFileSync(out, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({
  run,
  scanRecords: scans.length,
  axeViolationsByImpact: axeByImpact,
  axeViolatingViewViewports: new Set(axeRows.map((r) => r.id)).size,
  contrastViewViewports: contrastRows.length,
  targetsBelow24NotExempt: targetRows.filter((r) => r.below24NotExempt).length,
  reflowOverflowViewViewports: reflowRows.length,
  zoomEmulatedOverflow: zoomRows.length,
  pageErrorRecords: errorRows.length,
  keyboardRoutes: keyboardRows.length,
  keyboardTrapRoutes: keyboardRows.filter((r) => r.trapCandidates > 0).length,
  keyboardInvisibleFocusRoutes: keyboardRows.filter((r) => r.invisibleFocus > 0).length,
  keyboardObscuredRoutes: keyboardRows.filter((r) => r.obscuredFocus > 0).length,
  escapeTriggersTested: escapeRows.filter((r) => r.opened).length,
  escapeFailures: escapeRows.filter((r) => r.opened && (!r.closedOnEscape || !r.focusReturnedToTrigger)).length,
  motionViewsWithOffenders: motion.filter((m) => m.offenders > 0).length,
  i18nSwitchRoutesFound: i18nRows.filter((r) => r.found).length,
  i18nDocLangNotUpdated: i18nRows.filter((r) => r.found && !r.documentLangUpdated).length,
  summaryFile: out,
}, null, 2));
