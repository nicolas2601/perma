# PERMA assets

Owner: fc-asset-artist. Source of truth for visuals: Figma file `L2ld6aykwGET520sEfskjg` (read only). All files below are local; no temporary Figma URL is referenced from code.

## Inventory

| File | Bytes | Dimensions | Figma source | Notes |
|---|---|---|---|---|
| `src/assets/brand/perma-geometric-welcome.svg` | 2288 | 168 x 152 (root width/height kept) | 331:276 (vector layer) | Decorative Home art. Title and desc present. |
| `src/assets/brand/perma-mark.svg` | 423 | viewBox 36 | 141:2346 | Brand mark: surface tile + scan glyph. |
| `src/assets/icons/scan.svg` | 373 | viewBox 19 | 141:2383 / 141:2347 | Inspect nav, header mark. `currentColor` ink. |
| `src/assets/icons/home.svg` | 283 | viewBox 19 | 141:2379 | Desk nav. |
| `src/assets/icons/file.svg` | 314 | viewBox 19 | 141:2388 | Review nav. |
| `src/assets/icons/book.svg` | 304 | viewBox 19 | 141:2392 | Guide nav, Protocol card. |
| `src/assets/icons/more.svg` | 382 | viewBox 22 | 141:2352 | Workspace options. |
| `src/assets/icons/expand.svg` | 299 | viewBox 20 | 141:3134 | Fit tool. |
| `src/assets/icons/plus.svg` | 245 | viewBox 20 | 141:3138 | Zoom tool. |
| `src/assets/icons/layers.svg` | 303 | viewBox 20 | 141:3142 | Layers tool. |
| `src/assets/icons/info.svg` | 286 | viewBox 20 | 141:3146 | Info tool. |
| `src/assets/images/reference-tschandl-600.webp` | 8826 | 600 x 443 | 309:59 raw image | Reference photo, WebP. |
| `src/assets/images/reference-tschandl-600.avif` | 6871 | 600 x 443 | 309:59 raw image | Reference photo, AVIF. |
| `src/assets/images/reference-tschandl-300.webp` | 2960 | 300 x 222 | 309:59 raw image | Reference photo, WebP, small. |
| `src/assets/images/reference-tschandl-300.avif` | 2476 | 300 x 222 | 309:59 raw image | Reference photo, AVIF, small. |
| `public/favicon.svg` | 420 | viewBox 36 | derived from mark | Glyph enlarged, stroke 2.86 for 16 px legibility. |
| `public/icons/pwa-192.png` | 4180 | 192 x 192 | derived from mark | Any purpose. Opaque tile, rounded corners. |
| `public/icons/pwa-512.png` | 14237 | 512 x 512 | derived from mark | Any purpose. |
| `public/icons/pwa-maskable-512.png` | 5426 | 512 x 512 | derived from mark | Full-bleed tile, glyph inside the 80% safe circle. |
| `public/icons/apple-touch-icon-180.png` | 2131 | 180 x 180 | derived from mark | Full-bleed, no transparency (iOS applies its mask). |

Icons use `currentColor` for ink: set `color` in CSS; do not hard-code the fill.

## Reference image attribution (required in UI)

- Image: public dermoscopic reference photo, `reference-tschandl-*`.
- Author: P. Tschandl.
- License: CC BY-SA 4.0.
- Visible attribution text (ES/EN): "Imagen pública de referencia · P. Tschandl · CC BY-SA 4.0".
- Source record: Figma file `L2ld6aykwGET520sEfskjg`, node 309:59 (raw image upload). Figma caption: "Public reference · Original colour" and "P. Tschandl · CC BY-SA 4.0".
- Raw input SHA-256: `2ab99807e81e52c799dd8a9faf372767991f7cdd54af76603e5abfebc3611462` (600 x 443 JPEG, 166326 bytes).
- Open item: the canonical upstream URL of the photo is not stored in Figma. It must be recorded before publication; until then the license record rests on the Figma caption alone.
- No patient image is in the repo. Only the public reference is used.

Usage: `<img src=".../reference-tschandl-600.webp" width="600" height="443" loading="lazy" decoding="async" alt="...">` with `<picture>` AVIF first, WebP fallback. Use the 300 variant for thumbnails.

## Verification performed

- `svg-craft` `lint.mjs` on every SVG: clean (exit 0), before and after `optimize.mjs`.
- `render.mjs` at 1x light background for the geometric art (168), the mark (512, 64, 32, 16, both backgrounds), the icons (64), and the favicon (64, 32, 16, both backgrounds). Renders were opened and checked.
- Mono silhouette test (`--mono`) on the mark: fails by construction. The tile and the glyph are the same ink, so the silhouette is a solid rounded square. The mark is a container logo, not a single-ink mark. If a single-ink mark is needed, create a glyph-only variant.
- PNG dimensions checked with sharp metadata; AVIF confirmed as ISO Media / AVIF.
- SVGO run with the `static` profile. Root `width`/`height` on the geometric art were restored by hand after optimization. `aria-labelledby` was removed because SVGO strips the ids it points to; the accessible name comes from the `<title>` child.

## Known limits

- Figma full-node export (`export` in `download_assets`) for 331:276, 309:59 and the icons contained Figma placeholder artifacts: a `#E0E5EB` background rect, a debugging outline path and a clipped frame background. Those exports were discarded. The vector layers returned in `svgAssets` were used instead.
- The `figma-design-to-code` skill was not available locally, so `get_design_context` was not used. Only `get_metadata` and the download tools were used. Visual values were taken from the vector layers, not from generated code.
- Icon viewBoxes differ (19, 20, 22). Size them with CSS on the consumer side.
- The builder script that produced these files lives outside the repo (`/tmp/perma-asset-build/build-assets.mjs`). It is not reproducible from the repo yet. Move it under `src/assets/` if reproducibility is required, and add `sharp` as a dev dependency.
- `fc-asset-artist` specifies `assets/<id>/PROVENANCE.json`. The brief for this task sets the lane to `src/assets/**`, `public/**` and this file, so no `PROVENANCE.json` was written. This document carries the provenance.
