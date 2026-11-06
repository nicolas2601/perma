import { test, type Page } from '@playwright/test';
import { runLabel, slugOf } from '../lib/views';
import { saveJson } from '../lib/save';
import { describeActive, type FocusInfo } from '../lib/inpage';

// Main-flow screens (route paths). Seeded states are reached in the dev run via ?seed=result.
const FLOW_ROUTES = [
  '/',
  '/contexto',
  '/imagen',
  '/imagen/calidad',
  '/envio',
  '/envio/procesando',
  '/resultado',
  '/resultado/clases',
  '/inspeccion',
  '/examen/abcde',
  '/examen/comparar',
  '/revision',
  '/revision/exportar',
  '/guia',
];
const TAB_LIMIT = 120;
const TRAP_REPEAT = 3;
const BACKWARD_JUMP_PX = 24;
const DIALOG_WAIT_MS = 400;
const ESCAPE_CANDIDATE_CAP = 25;
const SEEDED_RUN_ROUTES = new Set(['/resultado', '/resultado/clases', '/inspeccion', '/examen/abcde', '/examen/comparar', '/revision', '/revision/exportar']);

function urlFor(route: string): string {
  if (runLabel() !== 'dev' || !SEEDED_RUN_ROUTES.has(route)) return route;
  return `${route}?seed=result`;
}

async function gotoScreen(page: Page, route: string): Promise<void> {
  await page.goto(urlFor(route), { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(400);
}

interface WalkSummary {
  readonly route: string;
  readonly tabPresses: number;
  readonly reachedBrowserOrEnd: boolean;
  readonly uniqueStops: number;
  readonly trapCandidates: string[];
  readonly invisibleFocus: Array<{ step: number; name: string }>;
  readonly obscuredFocus: Array<{ step: number; name: string; by: string }>;
  readonly backwardJumps: Array<{ step: number; from: string; to: string }>;
  readonly firstStops: string[];
}

function keyOf(f: FocusInfo): string {
  return `${f.tag}:${f.name}:${f.x},${f.y}`;
}

function summarize(route: string, steps: Array<FocusInfo | null>): WalkSummary {
  const trapCandidates: string[] = [];
  const invisibleFocus: WalkSummary['invisibleFocus'] = [];
  const obscuredFocus: WalkSummary['obscuredFocus'] = [];
  const backwardJumps: WalkSummary['backwardJumps'] = [];
  let run = 1;
  let prev: FocusInfo | null = null;
  const seen = new Set<string>();
  steps.forEach((f, i) => {
    if (!f) return;
    seen.add(keyOf(f));
    const visible = (f.outlineStyle !== 'none' && f.outlineWidth >= 2) || f.boxShadow !== 'none';
    if (!visible) invisibleFocus.push({ step: i + 1, name: f.name });
    if (f.obscuredBy) obscuredFocus.push({ step: i + 1, name: f.name, by: f.obscuredBy });
    if (prev && keyOf(prev) === keyOf(f)) {
      run += 1;
      if (run === TRAP_REPEAT) trapCandidates.push(keyOf(f));
    } else run = 1;
    if (prev && f.y + BACKWARD_JUMP_PX < prev.y) {
      backwardJumps.push({ step: i + 1, from: prev.name, to: f.name });
    }
    prev = f;
  });
  const lastNull = steps.lastIndexOf(null);
  return {
    route,
    tabPresses: steps.length,
    reachedBrowserOrEnd: lastNull !== -1,
    uniqueStops: seen.size,
    trapCandidates,
    invisibleFocus: invisibleFocus.slice(0, 30),
    obscuredFocus: obscuredFocus.slice(0, 30),
    backwardJumps: backwardJumps.slice(0, 30),
    firstStops: steps.filter((s): s is FocusInfo => s !== null).slice(0, 15).map((s) => `${s.tag}:${s.name}`),
  };
}

async function tabWalk(page: Page): Promise<Array<FocusInfo | null>> {
  const steps: Array<FocusInfo | null> = [];
  for (let i = 0; i < TAB_LIMIT; i += 1) {
    await page.keyboard.press('Tab');
    steps.push(await page.evaluate(describeActive));
  }
  return steps;
}

// Marks enabled buttons with an index. Must run after every reload, since reloads drop the attribute.
function markTriggers(): number {
  // Product sheets are opened by plain buttons (no aria-haspopup), so every enabled button is a candidate.
  const triggers = [...document.querySelectorAll('button:not([disabled])')];
  triggers.forEach((el, i) => el.setAttribute('data-a11y-trigger', String(i)));
  return triggers.length;
}

async function escapeChecks(page: Page, route: string): Promise<unknown[]> {
  const results: unknown[] = [];
  for (let i = 0; i < ESCAPE_CANDIDATE_CAP; i += 1) {
    await gotoScreen(page, route);
    const count = await page.evaluate(markTriggers);
    if (i >= count) break;
    const trigger = page.locator(`[data-a11y-trigger="${i}"]`).first();
    if (!(await trigger.isVisible().catch(() => false))) continue;
    const label = (await trigger.textContent())?.trim().slice(0, 40) ?? '';
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator('[role=dialog]').first();
    const opened = await dialog.waitFor({ state: 'visible', timeout: DIALOG_WAIT_MS }).then(() => true, () => false);
    if (!opened) {
      results.push({ trigger: label, opened: false });
      continue;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(DIALOG_WAIT_MS);
    const closed = !(await dialog.isVisible().catch(() => false));
    const focusReturned = await page.evaluate(
      (idx) => document.activeElement === document.querySelector(`[data-a11y-trigger="${idx}"]`),
      i,
    );
    results.push({ trigger: label, opened: true, closedOnEscape: closed, focusReturnedToTrigger: focusReturned });
  }
  return results;
}

test.describe('keyboard-only walk of the flow', () => {
  for (const route of FLOW_ROUTES) {
    test(`tab walk ${route}`, async ({ page }) => {
      await gotoScreen(page, route);
      const steps = await tabWalk(page);
      saveJson(`keyboard/tab-${slugOf(route)}.json`, summarize(route, steps));
    });

    test(`escape ${route}`, async ({ page }) => {
      const dialogs = await escapeChecks(page, route);
      saveJson(`keyboard/escape-${slugOf(route)}.json`, { route, triggersTested: dialogs.length, results: dialogs });
    });
  }
});
