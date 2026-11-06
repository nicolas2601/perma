# Design uplift: warmer system, same clinical contract

Scope: design system only (`src/styles/tokens.css`, `src/ui/**`, tests). Screens under `src/features/**` are untouched and adopt the system later.

## What changed

- **Soft tints** (`--tint-*` / `--deep-*`): mint, sky, butter, blush, lilac, each with a deep tone for icons, blobs and text on the tint. Tints mark navigation and category identity only (exam phase). They never express model output, risk or clinical meaning.
- **Surfaces**: `Card` gains `variant` (`outline`, `soft`, `raised`). Without `variant` the legacy `tone` rendering is unchanged, so existing feature screens do not shift.
- **Radii**: 20 px sheet, 16 px card (new `--r-card`), 14 px blob and legacy tile, 12 px nav, 10 px control, 8 px chip. Existing tokens kept; `--r-card` and `--r-blob` are the only additions.
- **Depth**: `shadow-raised` (layered, very light), `shadow-key` (1 px top highlight on primary) and `shadow-key-pressed` (inset). Primary stays flat teal.
- **Press**: interactive cards scale to 0.98 over 140 ms, transform only. Hover is gated by `fine-hover` (`(hover: hover) and (pointer: fine)`). Under reduced motion the scale is dropped for a 0.9 opacity change.
- **New components**: `Chip`, `IconBlob`, `Stepper`, `Tile`, `SectionHeading`, `EmptyState`, `DrawCheck`. `Button` gains `variant="soft"` (with `tint`).

## Contrast (WCAG 2.x relative luminance, computed with `python3 -I`)

Ratios are the values the unit test in `tests/unit/ui/tints-contrast.test.ts` asserts against `tokens.css`. No deep tone needed adjustment.

| Pair | Ratio | Threshold | Result |
| --- | ---: | ---: | --- |
| Ink `#1f2b2a` on mint `#dcf1ea` | 12.39 | 4.5 | pass |
| Deep mint `#0b6b5a` on mint | 5.46 | 4.5 | pass |
| Ink on sky `#dcebf7` | 12.02 | 4.5 | pass |
| Deep sky `#1f5f93` on sky | 5.54 | 4.5 | pass |
| Ink on butter `#fcefc9` | 12.75 | 4.5 | pass |
| Deep butter `#8a5a00` on butter | 5.17 | 4.5 | pass |
| Ink on blush `#fbe3de` | 11.93 | 4.5 | pass |
| Deep blush `#a2412f` on blush | 5.14 | 4.5 | pass |
| Ink on lilac `#e8e3f7` | 11.66 | 4.5 | pass |
| Deep lilac `#5b3fa0` on lilac | 6.29 | 4.5 | pass |
| Muted `#566963` on canvas `#f2f5f4` | 5.32 | 4.5 | pass |
| Muted on mint | 4.95 | 4.5 | pass |
| Muted on sky | 4.80 | 4.5 | pass |
| Muted on butter | 5.10 | 4.5 | pass |
| Muted on blush | 4.77 | 4.5 | pass |
| Muted on lilac | 4.66 | 4.5 | pass |
| Accent `#006779` on surface, and on-accent on accent | 6.53 | 4.5 | pass |
| Disabled text `#4b6259` on disabled surface `#e4ece9` | 5.48 | 4.5 | pass |
| Error `#a52a37` on surface | 7.03 | 4.5 | pass |
| Line `#7d9692` on surface (control borders, dots) | 3.16 | 3.0 | pass (UI) |
| Soft-line `#d4dfdb` on surface | 1.37 | none | decorative only |

Limits of the table:

- `soft-line` at 1.37:1 is decorative. A control must never rely on it as its only boundary. Interactive chips use the transparent border and the tint, and the selected state uses `border-current`, which is the deep tone (5.14:1 to 6.29:1 on its tint, above the 3:1 UI threshold).
- The table covers token pairs. Gradients, images or overlays behind text are not covered and need a rendered check.

## Rules for the tints

1. A tint names a place (phase, section, step), not a result. Never color a model score, an error or a risk with a tint.
2. Pair every tint with text or an icon. Hue alone carries no meaning.
3. Phase mapping: contexto=sky, imagen=mint, analisis=butter, resultado=lilac, observaciones=blush. Revisión has no tint and uses the neutral subtle surface (`PHASE_TINT` in `src/ui/tints.ts`).

## Components

| Component | Contract |
| --- | --- |
| `Chip` | Static label, or a button with 44 px minimum target when `onClick` is set. `selected` sets `aria-pressed`. |
| `IconBlob` | 40 or 48 px tile. Decorative (`aria-hidden`) unless `label` is set. `tone="surface"` for use on a tinted card. |
| `Stepper` | `nav` with an ordered list of six steps. Current step has `aria-current="step"` and shows its tint and label. Other steps are dots with screen-reader names. `onSelect` makes every step a 44 px button; navigation is never blocked. Label fades in over 100 ms (opacity only, valid under reduced motion). |
| `Tile` | Soft card, IconBlob (surface tone), `h3` title, one line of body. |
| `SectionHeading` | Optional eyebrow, title heading (`h2` default), decorative quarter-circle accent in the tint's deep tone. |
| `EmptyState` | Optional `art` (decorative), title, body, action. `titleAs` sets the heading level. |
| `DrawCheck` | Check that draws on once over 320 ms (`motion-safe` only). Static when reduced motion is on. No loops, no counters. |

## Verification

- `npx vitest run tests/unit/ui`: 52 tests, including the contrast guard against `tokens.css`.
- `npx tsc --noEmit`, `npx eslint .`: exit 0.
- Playwright (dev server on port 5213, page at `/src/ui/dev/system.html`): screenshots at 390 px and 1280 px, no horizontal overflow, no console errors, no interactive target under 44 px.
- The system page is mounted only by `src/ui/dev/system.html` (dev). `src/app` is unchanged; the production bundle does not import it.

## Open limits

- Illustrations for `EmptyState` are demo shapes in `SystemSectionsUplift.tsx`; real art comes from `src/assets/illustrations`.
- `DrawCheck` is verified by its class contract and a static screenshot. The 320 ms draw has not been watched frame by frame on a real device.
- Revisión has no tint by decision; if the design team wants one, add a sixth tint and re-run the contrast guard.
