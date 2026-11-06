// PERMA mark geometry: "iris P" (concept 1, v2). Drawn on a 64 x 64 grid.
// Mechanism: a P whose bowl is a camera iris (one aperture gap) around a teal lens core.
// Deterministic: no randomness, so every export is reproducible from this file.

export const VIEW = 64;
const STEM = { x: 14, width: 8, bottom: 54, rx: 2 };
const RING = { cx: 36, cy: 24, r: 12, stroke: 8, gap: 16, rotate: 92 };
const CORE_R = 4;

/** Outer top of the bowl; the stem top is aligned to it so the P has one flat top line. */
const TOP = RING.cy - RING.r - RING.stroke / 2;

/** Bounding box of the drawn glyph (stem + bowl). The glyph is centred on this box, not on the grid. */
export const BOUNDS = {
  x: STEM.x,
  y: TOP,
  width: RING.cx + RING.r + RING.stroke / 2 - STEM.x,
  height: STEM.bottom - TOP,
};

/**
 * Glyph markup whose bounding box is centred on (cx, cy), optionally scaled about that point
 * (e.g. the maskable safe zone). Colours are parameters so one geometry serves full colour, white-on-teal and one-ink.
 */
export function markGlyph({ ink, accent, scale = 1, cx = VIEW / 2, cy = VIEW / 2 }) {
  const ccx = BOUNDS.x + BOUNDS.width / 2;
  const ccy = BOUNDS.y + BOUNDS.height / 2;
  const transform = `translate(${cx} ${cy}) scale(${scale}) translate(${-ccx} ${-ccy})`;
  const stem = `<rect x="${STEM.x}" y="${TOP}" width="${STEM.width}" height="${BOUNDS.height}" rx="${STEM.rx}" fill="${ink}"/>`;
  const dash = (2 * Math.PI * RING.r - RING.gap).toFixed(2);
  const ring = `<circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r}" fill="none" stroke="${ink}" stroke-width="${RING.stroke}" stroke-dasharray="${dash} ${RING.gap}" transform="rotate(${RING.rotate} ${RING.cx} ${RING.cy})"/>`;
  const core = `<circle cx="${RING.cx}" cy="${RING.cy}" r="${CORE_R}" fill="${accent}"/>`;
  return `<g transform="${transform}">${stem}${ring}${core}</g>`;
}
