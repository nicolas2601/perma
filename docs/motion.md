# Motion system

Source of truth for numbers: `docs/BRIEF.md` (Motion section) and `docs/adr/R3-motion.md`.
Pure contracts live in `src/core/motion/`, React adapters and CSS in `src/motion/`.

## Numbers

| Token | Value | Notes |
|---|---|---|
| `MOTION_MS.press` | 140 ms | Brief range 120-160 ms, ease-out |
| `PRESS_SCALE` | 0.97 | Active state only, enabled controls only |
| `PRESS_REDUCED_OPACITY` | 0.85 | Reduced press feedback (opacity, 100 ms) |
| `MOTION_MS.entry` | 220 ms | Home entry item duration |
| `MOTION_MS.stagger` | 80 ms | Between Home children (brief range 60-100 ms) |
| `ENTRY_OFFSET_PX` | 12 px | Home entry offset, with opacity 0 to 1 |
| `MOTION_MS.route` | 220 ms | Route View Transition |
| `MOTION_MS.sheet` | 240 ms | `sheetSpring`: `{ type: 'spring', duration: 0.24, bounce: 0 }` |
| `SHEET_OFFSET_PX` / `SHEET_EXIT_OFFSET_PX` | 16 px / 8 px | Sheet enter and exit offsets |
| `MOTION_MS.sheetExit` | 120 ms | Exits are faster and smaller than entries |
| `MOTION_MS.accordion` | 200 ms | Not in the brief. Proposed in ADR-R3, still to confirm with Nico |
| `MOTION_MS.fade` | 100 ms | Reduced-motion crossfade for every contract |
| `EASE_OUT` | `[0.23, 1, 0.32, 1]` | Same curve as `--ease-out` in `tokens.css` |
| `PRESS_HOVER_QUERY` | `(hover: hover) and (pointer: fine)` | Gate for hover visuals |
| Zoom | scale 1 to 4 | `ZOOM_MIN`, `ZOOM_MAX`; transform only, inertia on release |

Rules: only `transform` and `opacity` move; never `transition: all`; no `ease-in` on entries;
nothing scales from `scale(0)`; reduced motion keeps the same state change with a 100 ms crossfade.
Forbidden: animated score counters, scan loops, fake waits, infinite decorative loops. The
`tests/unit/motion/forbidden-patterns.test.ts` scan enforces them across `src/`.

## Contracts and usage

### Tokens and springs (`src/core/motion`)
- `MOTION_MS`, `msToSeconds`: ms in tokens, seconds only inside the Motion adapter.
- `sheetSpring`, `indicatorSpring`: bounce 0, always explicit.

### MotionProvider
Wrap the app root once. It renders `<MotionConfig reducedMotion="user">`, which drops transform and
layout animations for any component that forgets its reduced branch.

```tsx
<MotionProvider><App /></MotionProvider>
```

### Presets: `useMotionPreset(name)`
`name` is `'entry' | 'sheet' | 'indicator' | 'crossfade'`. Returns `initial`, `animate`, `exit`,
`transition`, `exitTransition`. Reduced variants are opacity only, 100 ms.

```tsx
const preset = useMotionPreset('sheet');
<motion.div role="dialog" initial={preset.initial} animate={preset.animate} exit={preset.exit}
  transition={preset.transition} />;
```

### Route transitions: `runRouteTransition(update)`
- Default: `document.startViewTransition` with a 220 ms duration.
- Reduced: still a View Transition, with the duration clamped to 100 ms (crossfade).
- No View Transitions API: `update()` runs directly. Render `<RouteFade>` around the outlet,
  keyed by route, for a 220 ms opacity fade (100 ms reduced).
- Returns the plan `{ kind, durationMs }`. Keep one route transition in flight.

### HomeEntry (one sequence per Home mount)
```tsx
<HomeEntry>
  <HomeEntryItem>...</HomeEntryItem>
</HomeEntry>
```
80 ms stagger, opacity plus 12 px, 220 ms. Reduced: no stagger, no offset, 100 ms opacity.
Do not nest `HomeEntry` and do not use `HomeEntryItem` for per-section or hover reveals.

### Press: `usePressScale(disabled)`
Returns `whileTap` and `transition` for a `motion.button`. Disabled returns `whileTap: undefined`.
Reduced: `{ scale: 1, opacity: 0.85 }` over 100 ms. CSS class `.perma-press` mirrors it
(scale only on `:active`, hover only under `PRESS_HOVER_QUERY`).

### Nav indicator: `<NavIndicator activeId>`
Render it inside the active nav item only. Default: `layoutId="nav-indicator"` with the 240 ms spring.
Reduced: keyed opacity crossfade (100 ms), because layout projection is off under reduced motion.

### Accordion: `<AccordionBody open>`
Height animates through `grid-template-rows` 0fr to 1fr (200 ms, 100 ms reduced) via
`.perma-accordion-body`. Keep the list short: this is layout, not compositor work.

### Viewer zoom: `useInertiaZoom({ viewport, reducedMotion })`
Returns motion values `scale`, `x`, `y` plus `pinch`, `pan`, `release`, `reset`.
- Gestures write values directly (no animation while fingers move).
- `release(velocity)` decelerates with `type: 'inertia'`, bounded by the pan limits.
- Reduced: no inertia, settle in 100 ms.
- Apply transform through the motion values; set `touch-action: none` on the viewer surface only.

Pure math in `src/core/motion/zoomMath.ts`: `clampScale`, `panLimits`, `clampPan`,
`zoomAroundPoint` (keeps the focal content fixed), `pinchScale`, `distance`.

### Global CSS (`src/motion/motion.css`)
Import it once at the app entry. It defines `--motion-*` variables (ms, with the same numbers),
the `.perma-press`, `.perma-accordion-body` rules, the `::view-transition-*` duration, and the
reduced-motion overrides: all durations to 100 ms, `--motion-press-scale: 1`, and
`[data-motion='move'] { transform: none !important }`. Any new element that moves must carry
`data-motion="move"`.

## Tests

| Layer | Location | What it proves |
|---|---|---|
| Unit | `tests/unit/motion/*.test.ts(x)` | Every contract, reduced branch and math (50 tests) |
| Lint-style scan | `tests/unit/motion/forbidden-patterns.test.ts` | No forbidden patterns in `src/` |
| E2E (Chromium) | `tests/e2e/motion/motion-contract.spec.ts` | `document.getAnimations()` durations <= 100 ms and no transform keyframes under `reducedMotion: 'reduce'`; 200 ms accordion by default |

Run: `npx vitest run tests/unit/motion`, `npx playwright test tests/e2e/motion`.

## Not verified yet
- Home, nav, sheets, route and viewer wiring: the app does not mount these components yet
  (the lanes for `src/ui/**` and `src/app/router.tsx` belong to other squads).
- `ViewTransition` runtime on Safari and Firefox: the fallback path is unit-tested only.
- Frame-rate and GPU behaviour: no performance trace has been taken, so no claim is made.
