# PERMA spot illustrations

Eight small spot illustrations for states and moments in the flow. They make the app friendlier without implying any clinical claim: no faces, no body parts, no skin, no medical crosses, no text inside the art.

## Concept

- Flat geometric shapes, no outlines on coloured fills, matching the Home art (`src/assets/brand/perma-geometric-welcome.svg`).
- Recurring motifs: a rounded square (sometimes rotated), a circle, a dotted link, and a soft tint field.
- One line system: round caps and joins, 5-unit strokes for primary lines and 2.5 for secondary ones.
- viewBox `0 0 160 120` (4:3), transparent background so they sit on canvas or surface.

| File | State it supports | Role |
|---|---|---|
| `empty-compare.svg` | Compare with no prior image yet | decorative |
| `waiting-response.svg` | Waiting for a response, static, no fake progress | decorative |
| `offline.svg` | Offline, broken signal | informative |
| `server-problem.svg` | Server error | informative |
| `permission-camera.svg` | Camera permission, abstract lens with hand-off tile | informative |
| `file-problem.svg` | File unavailable or invalid | informative |
| `export-done.svg` | Export finished, animatable draw-on check | informative |
| `consent-privacy.svg` | Consent and privacy | informative |

Informative files carry `role="img"`, `<title>` and `<desc>` in Spanish, and `aria-labelledby`. Decorative files carry `aria-hidden="true"` and no title, because the adjacent text already states the state.

## Palette usage

Each hue is used as a tint for fills and a deeper tone for small accents:

- Ink `#1f2b2a`: reserved for text-like detail. Not used in the current set.
- Accent `#006779`: primary shapes, check marks, the lens core.
- Mint `#dcf1ea` / `#0b6b5a`, sky `#dcebf7` / `#1f5f93`, butter `#fcefc9` / `#8a5a00`, blush `#fbe3de` / `#a2412f`, lilac `#e8e3f7` / `#5b3fa0`.
- Canvas `#f2f5f4` and white: available for pages, not painted into the art.

Blush marks problems (offline gap, file problem); it is never a status colour on its own. Do not add colours outside this list.

## Embedding

- **`<img>`**: the default for decorative and static use. `import { illustrationUrl } from '@/assets/illustrations'` then `<img src={illustrationUrl('offline')} alt="" width={160} height={120} decoding="async" />`. Static files work; CSS inside the SVG still runs in `<img>`.
- **Inline**: required for `export-done.svg` to animate. Inline the SVG (or import it as a React component through a loader) and add the class `ill-animate` to the root `<svg>`. The check draws on over 320 ms. Without the class the default is the finished picture, and `prefers-reduced-motion: reduce` disables the animation.
- Do not use the `ill-animate` class on `<img>`; it has no effect there.

## What was rendered and looked at

- All eight SVGs passed `node ~/.claude/skills/svg-craft/tools/lint.mjs` (exit 0, "clean") before and after optimization.
- All eight were optimized with `optimize.mjs` (static profile; `--animated` for `export-done.svg`). Sizes after optimization: 0.5 to 1.0 kB each, 5.8 kB total against the 30 kB budget.
- Rendered with the flat style pack renderer (`illustration-flat-with-black/scripts/render.mjs`) into `src/assets/illustrations/_contact-sheet.png` and opened. Visual issue found and fixed: the first `file-problem` used a white document on a white background and read as a bracket; it now uses a sky fill with white bars.
- `tsc --noEmit` exit 0; `eslint src/assets/illustrations` exit 0; `npm run lint` exit 0.

## What was not checked

- True 1x native rendering. The pack renderer draws every file into a 480x360 frame, so the 1x PNGs are 480x360 and the 2x PNGs are 960x720, not 160x120 and 320x240. Scale behaviour was judged on the contact sheet only.
- Dark backgrounds, RTL, and the real page layouts. Only white backgrounds were rendered.
- The draw-on animation in a browser (timing and reduced-motion behaviour were not played back; only the CSS was checked).
- Contrast and legibility at 16 px or in small cards.
- Visual review by a designer or a user test.

## Deviations from the pack contract

The flat pack's lint (`illustration-flat-with-black/scripts/lint.mjs`) fails all eight files on two card-contract rules: it expects a 480x360 viewBox and forbids `<style>` and `class`. Both were deliberate:

- The brief asks for 160x120 spot art, so the viewBox stays 160x120 (same 4:3 ratio as the card contract).
- `export-done.svg` needs a `<style>` block and a class for the draw-on animation. This is the only file where the pack's no-`<style>` rule was broken on purpose.

Every other flat-pack lint check passed, including palette (no off-palette colours). The PERMA palette file used for that check lives at `/tmp/perma-illus/style.json`, outside the repo.

## Regenerating

The SVGs are hand-written (small, geometric, no generator). Edit the file, run `lint.mjs`, `optimize.mjs`, and `render.mjs` in that order, and re-check the contact sheet.
