# PERMA brand

Status: v1 mark, chosen 2026-11-06. Source of truth for geometry: `src/assets/brand/generators/mark.mjs`.

## Concept

**Iris P.** A P whose bowl is a camera iris: the ring has one aperture gap, and a teal lens core sits at its centre.

- The P is the product initial. The stem and bowl are the only shapes, so the mark survives 16 px.
- The iris is the image-capture part of the product (the clinician looks through a lens at the lesion).
- The teal core is the single point of focus: the examined spot. It is the only accent in the mark.

Mechanism, stated plainly: a P built from a lens. Nothing in it is a medical symbol, a seal, a badge or a certificate.

## Rationale for this concept

Four concepts were drawn as seeded generators (`src/assets/brand/explorations/`) and rendered at 512, 64, 32 and 16 px, light, dark and mono (contact sheets, rendered and inspected):

| Concept | Result | Decision |
|---|---|---|
| 1. Iris P (`c1-iris-p-v2.mjs`) | Reads as a P at 64 px, keeps the P and the open bowl at 16 px, holds on dark and in one ink. Ties the name to the capture device. | **Chosen.** |
| 2. Skin section (`c2-skin-section.mjs`) | Reads as a battery, ID card or generic UI tile. No link to PERMA. | Rejected. |
| 3. Pixel scan (`c3-pixel-scan.mjs`) | A 5 x 5 cell grid drops the P bowl; at 16 px it is noise. | Rejected. |
| 4. Tile lens (`c4-tile-lens.mjs`) | Clean, Home-art language, but reads as a gem or price tag. No P, no identity. | Rejected as the mark; kept as Home art reference. |
| 4b. Tile lens + plus (`c4-tile-plus.mjs`) | Reads as a pharmacy or medical sign. | Rejected by the brief's no-medical-cross rule. |

Refinement on concept 1 (v1 to v2): the stem top was 2 units below the bowl's outer top, which made a notch at the top line. The stem now aligns to the bowl's top, and the aperture gap was widened from 13.4 to 16 units so the bowl still reads open at 16 px.

The previous mark (viewfinder corners and a dot, `src/assets/brand/perma-mark.svg` before this change) was a generic scan glyph. Its mono silhouette failed by construction because the tile and glyph shared one ink.

## Files

| File | Purpose |
|---|---|
| `src/assets/brand/perma-mark.svg` | Mark only, full colour, transparent. Used in the app header. |
| `src/assets/brand/perma-logo-horizontal.svg` | Mark + PERMA wordmark, full colour. |
| `src/assets/brand/perma-logo-mono.svg` | Mark + wordmark in one ink (`currentColor`). Print, stamps, one-colour use. |
| `public/favicon.svg` | Teal tile with a white mark. |
| `public/icons/pwa-192.png`, `pwa-512.png` | Any-purpose icons: teal tile with a white mark. |
| `public/icons/pwa-maskable-512.png` | Full-bleed teal; mark scaled to 80 % and inside the 80 % safe circle. |
| `public/icons/apple-touch-icon-180.png` | Opaque, full-bleed teal (iOS applies its own mask). |
| `public/og-image.webp` | 1200 x 630 social card: lockup and tagline on the canvas colour. |

The wordmark is outlined (no live font): `src/assets/brand/generators/wordmark.json` holds Geist SemiBold 600 for "PERMA" and Geist Regular 400 for the tagline, as SVG path data.

## Clear space and minimum size

- **Clear space:** keep at least 1/4 of the mark height free on every side of the lockup. For the mark alone, the same rule applies (about 11 units at a 46-unit glyph height).
- **Mark minimum:** 16 px (checked: the P and the open bowl are still legible at 16 px on light and dark).
- **Lockup minimum:** 120 px wide on screen (wordmark cap height about 18 px at that width). This is a practical floor I chose, not a device-tested limit; print minimum is not set yet.
- The mark has no built-in tile. Put it on a tile only in the icon contexts above.

## Colour

| Token | Hex | Use in the brand | Contrast |
|---|---|---|---|
| Ink | `#1f2b2a` | Mark P and wordmark on canvas or surface | 13.3:1 on canvas, 14.6:1 on white |
| Accent (teal) | `#006779` | Lens core; icon tile background | 6.5:1 white on teal (tile glyph) |
| Surface | `#ffffff` | Glyph colour on teal tiles | n/a |
| Canvas | `#f2f5f4` | OG card background | n/a |

Rules:
- Two brand colours at most (ink and teal). No gradients, no shadows, no outlines.
- The core is the only teal element on the light mark. Do not add teal to the P.
- On dark backgrounds, use the mono lockup in a light `currentColor`, or place the full-colour mark on a light tile. Do not place the full-colour mark on a dark surface.

## Do and don't

Do:
- Use `perma-mark.svg` in the header, at 28 to 32 px, with `alt="PERMA"`.
- Use the icon tiles for install prompts, home screens and browser tabs.
- Use the mono lockup for one-colour print.

Don't:
- Don't add a medical cross, plus, caduceus, stethoscope, face, or any clinical symbol to the mark.
- Don't add a seal, badge, check mark or certification look. The product is a research prototype with no certification.
- Don't stretch, rotate, outline, shadow or recolour the P.
- Don't rebuild the wordmark with a live font. Use the outlined files.
- Don't place the mark over patient images or over busy photos.

## Licence

Original work for PERMA. The mark is drawn from geometry in this repository (`src/assets/brand/generators/mark.mjs`), with no third-party icon, stock asset or generator output. The wordmark and tagline are outlines of Geist (SIL Open Font License 1.1, `node_modules/@fontsource-variable/geist/LICENSE`). No font file is shipped in these assets. The Geist copyright notice declares no Reserved Font Name, so the outlines carry no naming restriction. Keep the OFL notice with any redistribution of the Geist font itself.

## Regenerating

```
node src/assets/brand/generators/build-brand.mjs
node ~/.claude/skills/svg-craft/tools/optimize.mjs <svg> -o <svg>   # static profile, for each SVG
node ~/.claude/skills/svg-craft/tools/lint.mjs <svg>
```

`build-brand.mjs` needs `rsvg-convert` (librsvg) and ImageMagick (`magick`, WebP). It writes the SVGs, the PNG icons and the WebP card. Run the optimizer and lint after each build, then check the sheets again. The concept scripts in `src/assets/brand/explorations/` regenerate the contact sheets (`render-sheet.mjs <module> <name>`).

## Verification

- `src/assets/brand/**` and `public/**` SVGs lint clean (svg-craft `lint.mjs`).
- `tests/unit/platform/brand-assets.test.ts` checks that every icon referenced in `index.html` and `vite.config.ts` exists, that PNG sizes are exact (IHDR), that the apple-touch icon is opaque, that the OG card is WebP, and that every SVG has a `<title>`.
- Rendered and inspected: the four concepts at 512, 64, 32 and 16 px (light, dark, mono); the final mark and favicon at 16 px (zoomed); the maskable safe zone; the lockup; the OG card.

Not checked: real iOS and Android home screens, and the OG card on social platforms.
