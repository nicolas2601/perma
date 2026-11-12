# ADR R3: Motion system (Motion 14.9.1, View Transitions, reduced motion, testing)

- Status: Proposed
- Lane: R3 motion researcher (Research squad)
- Scope: decisions only. No code files were created; snippets are reference shapes to validate in a spike.
- Source of truth for numbers: `docs/BRIEF.md`, section "Motion (numbers)".

## Evidence summary

| Claim | Status | Evidence |
|---|---|---|
| Installed `motion` is 14.9.1 and `react` is 19.3.1 | VERIFIED | `node_modules/motion/package.json` 14.9.1; `node_modules/react/package.json` 19.3.1; `package.json` pins `motion ^14.9.1`, `react ^19.3.1`. npm `latest` for `motion` is 14.9.1. |
| Motion exports `motion`, `MotionConfig`, `LayoutGroup`, `AnimatePresence`, `useReducedMotion`, `useAnimate`, `animate`, `animateView` from `motion/react` | VERIFIED | `node_modules/motion/dist/cjs/react.js` export keys; `node_modules/framer-motion/dist/index.d.ts` export list. |
| React 19.3.1 stable ships `ViewTransition` (not canary-gated) | VERIFIED (exported in the installed stable build) | `node_modules/react/cjs/react.production.js:395` `exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE`; same symbol in `react.development.js:878`; `addTransitionType` exported at line 404; react-dom build has 219 references. Runtime behavior is NOT yet verified: confirm in Playwright (see Testing). |
| `MotionConfig reducedMotion="user"` disables transform and layout animations and keeps opacity | VERIFIED (Context7 `/websites/motion_dev`, motion.dev/docs/react-accessibility) | Doc text: "disable transform and layout animations ... while preserving opacity and backgroundColor". |
| Motion spring defaults: `duration` in seconds, `bounce` default 0.25 with `duration` | VERIFIED (Context7 `/motiondivision/motion`, `_autodocs/configuration.md`) | Therefore `bounce: 0` must be explicit. |
| `inertia` generator exists in Motion 14.9.1 | VERIFIED (file present) | `node_modules/motion-dom/dist/es/animation/generators/inertia.mjs`. Option names (`power`, `timeConstant`, `min`, `max`) still to confirm against that file in the spike. |
| `animateView()` exists in Motion 14.9.1 and wraps the native View Transition API | VERIFIED (file + d.ts) | `node_modules/motion-dom/dist/es/view/index.mjs:171`; `start.mjs:52` checks `document.startViewTransition`; options type `AnimationOptions & { interrupt?: "wait" \| "immediate" }`. Fallback behavior of `animateView` when unsupported: to confirm in spike. |
| `x`/`scale`/`rotate` shorthands run on the JS main thread; literal `transform` and `opacity` run on WAAPI | VERIFIED from Motion's internal `plans/PERFORMANCE_AUDIT.md` (a plan document, may describe unshipped work) | Same audit: default opacity and literal-transform animation is WAAPI-accelerated. Confirm at runtime with `document.getAnimations()` (see Testing). |
| Playwright 1.65 supports reduced-motion emulation | VERIFIED | `node_modules/playwright-core/types/types.d.ts` has `reducedMotion?: null \| "reduce" \| "no-preference"`. `@playwright/test` is 1.65.0. |
| Browser support of same-document View Transitions per browser | NOT VERIFIED here | Treat as Chromium-first. Check MDN/caniuse before shipping. Fallback path is mandatory. |

## ADR-R3-01: Motion 14.9.1 via `motion/react`

Decision: use `motion/react` (v14.9.1, already pinned). Do not add `framer-motion` or `gsap`.

Why: installed and pinned, React 19 compatible, one animation runtime for springs, layout, gestures and view transitions.

Tradeoff: Motion pulls JS for layout projection and gestures. Keep it out of hot paths (see ADR-R3-05).

Rule: import only from `motion/react` in app code. The `motion` package root is for vanilla use only (e.g. `animateView` if not re-exported).

## ADR-R3-02: Springs and sheets (bounce 0, about 240 ms)

Spring token for sheets (the "from origin, interruptible" motion):

```tsx
import { motion, MotionConfig, useReducedMotion } from "motion/react";

const sheetSpring = { type: "spring", duration: 0.24, bounce: 0 } as const;

<motion.div
  role="dialog"
  initial={{ transform: "translateY(16px)", opacity: 0 }}
  animate={{ transform: "translateY(0px)", opacity: 1 }}
  exit={{ transform: "translateY(8px)", opacity: 0, transition: { duration: 0.12 } }}
  transition={sheetSpring}
/>;
```

Notes:
- `bounce: 0` is required; the default is 0.25.
- Use string `transform` keys, not the `y` shorthand, so the animation is WAAPI-eligible (ADR-R3-05). Exit is faster and smaller than enter, as the brief requires.
- Interruptible by default: a new `animate` target on the same element retargets from the current velocity. Verify in the spike that closing mid-open does not jump.
- "From origin": set `transform-origin` to the trigger (CSS custom property set from the trigger's `getBoundingClientRect()` once on open, read-only, no per-frame reads).

Tradeoff: string transforms lose Motion's per-axis composition. Acceptable for sheets, which only move on one axis.

## ADR-R3-03: Nav indicator (`layoutId`) and accordion

### Nav indicator (floating glass nav: Escritorio, Examinar, Revisión, Guía)

```tsx
import { LayoutGroup, motion, useReducedMotion } from "motion/react";

const indicatorSpring = { type: "spring", duration: 0.24, bounce: 0 } as const;
const reduceFade = { duration: 0.1, ease: "easeOut" } as const;

function NavIndicator({ activeId }: { activeId: string }) {
  const reduce = useReducedMotion();
  return reduce ? (
    <motion.span
      key={activeId}
      aria-hidden
      className="absolute inset-0 rounded-full bg-accent/10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduceFade}
    />
  ) : (
    <motion.span
      layoutId="nav-indicator"
      aria-hidden
      className="absolute inset-0 rounded-full bg-accent/10"
      transition={indicatorSpring}
    />
  );
}
```

Reasoning: `MotionConfig reducedMotion="user"` turns off `layoutId` projection, which would make the indicator jump with no feedback. The keyed opacity branch gives the 100 ms crossfade the brief requires.

Note: `useReducedMotion()` returns `null` when the preference is unknown (SSR/first paint). Treat `null` as "no-preference" for the layout branch only after hydration, or render the crossfade branch until known. Decision: treat `null` as reduce for first paint (safer, no jump).

### ABCDE accordion (height)

Decision: CSS grid-rows transition, not Motion `height: "auto"`.

```css
.accordion-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--motion-d-accordion) var(--motion-e-out);
}
.accordion-body[data-open="true"] {
  grid-template-rows: 1fr;
}
.accordion-body > .accordion-inner {
  overflow: hidden;
  min-height: 0;
}
```

Why: no JS measuring, native interruption (the browser retargets when the state flips mid-transition), works with `prefers-reduced-motion` through the token. The 5-criterion sheet is small, so layout cost is bounded.

Tradeoff: height is a layout property (not compositor). Acceptable for one accordion of 5 items; not acceptable for a long list. Keep the accordion short; if it grows, switch to `transform: scaleY` on a clip wrapper (not recommended: distorts content).

Brief-level note: the accordion duration is not specified in the brief. Proposed value: 200 ms (`motion.duration.accordion`), flagged as a new number to confirm with Nico.

## ADR-R3-04: Route transitions (View Transitions, 220 ms, fallback)

Options considered:

| Option | What | Pros | Cons |
|---|---|---|---|
| A. Native wrapper | `document.startViewTransition` in a 15-line helper, CSS `::view-transition-*` durations | No dependency on Motion internals or React lanes; exact 220 ms; trivially testable | Manual fallback; we own the helper |
| B. Motion `animateView` | Motion 14.9.1 wrapper over the same native API | One library; per-target options; `interrupt` option | Depends on Motion view-transition internals (plan-level docs); fallback behavior still to confirm |
| C. React `<ViewTransition>` | Stable in 19.3.1 (verified export) | Declarative, React-native, good for shared elements | Only animates inside `startTransition`/`useTransition` lanes (`react-reconciler` gate); enter/exit/share callbacks add surface |

Decision: **A for route changes** (now). **C for shared-element moments later** (Imagen tab to viewer, image pair), after a spike. **Not B** for routes until Motion's `animateView` fallback is verified in source.

Helper (name only, proposed in `src/core/motion/viewTransition.ts`):

```ts
export function runRouteTransition(update: () => void): void {
  if (!document.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }
  document.startViewTransition(update);
}
```

CSS:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: var(--motion-d-route);      /* 220ms */
  animation-timing-function: var(--motion-e-out);
}
```

Fallback (no View Transitions API): the outlet fades in with Motion, opacity only, 220 ms:

```tsx
<motion.main
  key={pathname}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.22, ease: "easeOut" }}
/>
```

Reduced motion: the helper skips the View Transition and the outlet fade uses the 100 ms token through `useMotionPreset` (ADR-R3-06).

Pre-mortem risks:
- Double animation: a View Transition plus a Motion outlet fade on the same navigation. The fallback must run only when the native API is absent. Enforce with the helper, not with per-page checks.
- Navigation during an active transition: `startViewTransition` aborts the previous one; keep only one route transition in flight.

## ADR-R3-05: Engine choice by main-thread load

| Mechanism | Runs on | Use for | Do not use for |
|---|---|---|---|
| CSS transitions | Compositor for transform/opacity; browser-managed interruption | Press, hover, focus, accordion (grid rows), simple state toggles | Anything needing springs or orchestration |
| WAAPI (Motion string-transform / opacity, or `element.animate`) | Compositor for transform/opacity; no per-frame JS | Sheet enter/exit, route fade, ONE entry sequence on Home | `x`/`scale` shorthands (JS path per Motion audit) |
| Motion JS path (springs on shorthands, `layoutId` projection, gestures, inertia) | Main thread every frame | Nav indicator (`layoutId`), zoom/pan inertia, gesture-driven values | Background/decorative loops; per-section entries |

Decision rule:
1. Single property, state-driven, no interruption requirement: CSS.
2. Needs spring or orchestration, transform/opacity only: Motion with string keys (WAAPI-eligible).
3. Needs layout projection or gesture velocity: Motion JS, but only on one element at a time, and measured against INP <= 200 ms.

Tradeoff: writing CSS for press and accordion is more code than a Motion `whileTap`, but it avoids a JS frame loop on the main thread during INP-sensitive taps. Chosen.

## ADR-R3-06: Press feedback (CSS)

```css
.press {
  transition-property: transform, background-color;
  transition-duration: var(--motion-d-press);   /* 140ms */
  transition-timing-function: var(--motion-e-out);
}
.press:active {
  transform: scale(0.97);
}
@media (hover: hover) and (pointer: fine) {
  .press:hover {
    background-color: var(--color-subtle);
  }
}
```

Rules: explicit `transition-property` (never `transition: all`); scale only on `:active`; hover visuals gated by `(hover: hover) and (pointer: fine)`; `transform` is removed under reduced motion (see ADR-R3-07). Press duration 120-160 ms per brief; 140 ms chosen.

## ADR-R3-07: Global `prefers-reduced-motion` (100 ms crossfade)

Three layers, all driven by the same tokens:

1. CSS tokens (`src/styles/tokens.css`):

```css
:root {
  --motion-d-press: 140ms;
  --motion-d-route: 220ms;
  --motion-d-sheet: 240ms;
  --motion-d-accordion: 200ms;   /* proposed, not in brief */
  --motion-d-fade: 100ms;
  --motion-e-out: cubic-bezier(0.2, 0, 0, 1);  /* proposed value */
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-d-press: 100ms;
    --motion-d-route: 100ms;
    --motion-d-sheet: 100ms;
    --motion-d-accordion: 100ms;
  }
  .press:active { transform: none; }
  [data-motion="move"] { transform: none !important; }
}
```

2. Motion layer: `<MotionConfig reducedMotion="user">` at the app root as a safety net (drops transform and layout for any component that forgets), plus `useMotionPreset` returning crossfade variants when reduced.

3. Helper: `runRouteTransition` skips the View Transition under reduce.

Honest limit: CSS cannot change a transition's property set from duration alone. Transform removal is therefore explicit (`data-motion="move"` marks every moving element). Any new element that moves must carry that attribute; the Playwright test (below) catches misses.

Reduced-motion token pattern (ms in tokens, converted once to seconds for Motion):

```ts
const reduced = { duration: 0.1, ease: "easeOut" } as const;
```

## ADR-R3-08: Interruptible sheets and inertia zoom

Sheets: see ADR-R3-02 (retarget by default).

Inertia zoom and pan (Ajustar/Ampliar crossfade 100 ms is opacity only; zoom is transform):

```tsx
import { animate, useMotionValue } from "motion/react";

const MIN_ZOOM = 1;   /* proposed constants in the viewer module */
const MAX_ZOOM = 4;

const scale = useMotionValue(1);

function onPointerEnd(velocityY: number) {
  animate(scale, scale.get(), {
    type: "inertia",
    velocity: velocityY,
    min: MIN_ZOOM,
    max: MAX_ZOOM,
  });
}
```

Confirm `min`/`max`/`power`/`timeConstant` names in `motion-dom/dist/es/animation/generators/inertia.mjs` during the spike.

Rules:
- Transform only (`scale` + `translate`), `transform-origin` at the pinch/double-tap point. No layout reads during gestures.
- `touch-action: none` on the viewer surface only.
- `will-change: transform` only while a gesture is active, removed on release.
- The `scale` shorthand is JS per frame (ADR-R3-05). Acceptable: one image, one element, no layout. If INP regresses, switch to a string `transform` via `useTransform` (still JS-written, but fewer style-recalc costs).
- Ajustar/Ampliar switch: opacity crossfade 100 ms via the reduced token.

## ADR-R3-09: Home entry sequence and exits

Brief: ONE entry sequence on Home, stagger 60-100 ms, opacity + 12 px, no per-section entries, exits smaller and faster, never `ease-in` on entries, never `scale(0)`.

```tsx
const entry = { initial: { opacity: 0, transform: "translateY(12px)" }, animate: { opacity: 1, transform: "translateY(0px)" } };
const stagger = 0.08; // seconds; 80 ms within 60-100 ms

<motion.div variants={{ show: { transition: { staggerChildren: stagger } } }} initial="hidden" animate="show">
  {/* children use the entry variant above */}
</motion.div>
```

Forbidden: animated score counters, scan loops, fake waits (brief Prohibitions).

## ADR-R3-10: Proposed `src/core/motion` API (names only)

No code files in this ADR. Proposal for the module shape:

```
src/core/motion/
  tokens.ts          durations (ms), easings, spring presets, stagger, entry offset
  springs.ts         sheetSpring, indicatorSpring (type "spring", bounce 0)
  presets.ts         useMotionPreset(name): full variant or reduced crossfade
  reducedMotion.ts   prefersReducedMotion() (non-hook, for helpers), useReducedMotionSafe()
  viewTransition.ts  runRouteTransition(update)
  MotionProvider.tsx <MotionConfig reducedMotion="user"> at app root
  index.ts           public barrel
```

Exported names:
- `motionTokens` = `{ duration: { press, route, sheet, accordion, fade, stagger }, ease: { out, in? (forbidden for entries) }, offset: { entry: 12 } }`
- `springs` = `{ sheet, indicator }`
- `useMotionPreset(name: "entry" | "sheet" | "indicator" | "crossfade")`
- `runRouteTransition(update: () => void): void`
- `MotionProvider`

Rules: tokens are the only place for numbers; ms in tokens, seconds only in the Motion adapter; no `transition: all` helpers; no `ease-in` on entries (enforced by a lint check in review, not by the type system in v1).

Mirror: CSS custom properties in `src/styles/tokens.css` are generated from `tokens.ts` or hand-kept in sync; decision pending in the spike (proposal: hand-kept, with a Playwright check that the two match).

## Testing motion in Playwright

Use `@playwright/test` 1.65 in the project, real Chromium via the Playwright MCP tools for manual checks, and the test runner for regressions.

```ts
import { expect, test } from "@playwright/test";

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("sheet and route are crossfades <= 100 ms with no transform", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Protocolo" }).click();
    const animations = await page.evaluate(() =>
      document.getAnimations().map((a) => {
        const effect = a.effect as KeyframeEffect;
        return {
          ms: Number(effect.getComputedTiming().duration),
          props: effect.getKeyframes().flatMap((k) => Object.keys(k)),
        };
      }),
    );
    for (const a of animations) {
      expect(a.ms).toBeLessThanOrEqual(100);
      expect(a.props).not.toContain("transform");
    }
  });
});

test.describe("default motion", () => {
  test.use({ reducedMotion: "no-preference" });

  test("press uses explicit transition-property, never 'all'", async ({ page }) => {
    await page.goto("/");
    const props = await page
      .locator(".press")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionProperty);
    expect(props).not.toContain("all");
  });
});
```

What to assert:
- Reduced: every animation <= 100 ms, no `transform` keyframes, no `layoutId` transform projection.
- Default: press `transition-property` explicit; sheet duration about 240 ms; `bounce 0` verified by the spring's settle shape (or by a unit test on `springs.ts`, not by Playwright).
- View Transitions: `document.startViewTransition` is called once per navigation (spy via `page.addInitScript`); with the API removed (`delete document.startViewTransition` in init script), fallback fade runs and route still renders.
- Interruption: open sheet, close at 50% (`page.waitForTimeout` is forbidden; wait on `document.getAnimations().length` change), confirm no jump.
- Main-thread check: `performance.now()` deltas or Chrome trace via `chrome-devtools` MCP for the zoom gesture; INP <= 200 ms.
- Screenshots: take end-state screenshots with `animations: "disabled"` only for pixel baselines. Do not use it in motion tests.
- Caveats: `document.getAnimations()` may not include `::view-transition` pseudo-animations (verify in the spike; if not, assert via the spy). Run VT assertions only on Chromium.

Playwright MCP is allowed for manual checks (browser work only through Playwright MCP tools per BRIEF). Do not use `skipAnimations` from Motion in motion tests; it disables what we need to measure.

## Risks and tradeoffs (pre-mortem)

1. Motion 14 WAAPI eligibility is not what the docs say for every case (the audit is a plan document). Mitigation: assert `getKeyframes()` props in Playwright.
2. `layoutId` under reduced motion needs the keyed opacity branch, or the indicator jumps.
3. React `<ViewTransition>` requires transition lanes; a non-transition navigation silently does nothing. Do not mix it with route helper A.
4. Safari/Firefox View Transitions support varies; the fallback is a first-class path, not a debug flag.
5. CSS grid-rows accordion is layout-bound; keep the list small.
6. Forgotten `data-motion="move"` on a new moving element bypasses reduced motion. Mitigation: the Playwright reduced-motion test plus a review rule.

## Open items for Nico (one question at a time)

- Accordion duration (200 ms proposed) is not in the brief. Confirm or change.

## Next steps

1. Spike `motion/react` sheet and indicator in a scratch branch; verify WAAPI eligibility with `document.getAnimations()`.
2. Verify `animateView` fallback in source before choosing B over A for routes.
3. Verify `ViewTransition` runtime in Chromium with the Playwright test above.
4. Write `src/core/motion` once the spike passes (separate lane).
