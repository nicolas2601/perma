// Composes every PERMA brand artefact from the mark geometry and the outlined wordmark (no live fonts).
import { markGlyph, BOUNDS, VIEW } from './mark.mjs';

export const COLOR = {
  ink: '#1f2b2a',
  accent: '#006779',
  surface: '#ffffff',
  canvas: '#f2f5f4',
};

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const TILE_RADIUS = 14; // 22 % of 64, matches the app's rounded tile language
const WORDMARK_GAP = 14;

// The <title> child is the accessible name; no aria-labelledby, because SVGO strips the ids it would point to.
const doc = (vb, title, desc, body) =>
  `<svg ${NS} viewBox="${vb}" role="img"><title>${title}</title><desc>${desc}</desc>${body}</svg>\n`;

/** Mark only, full colour, transparent. Used in the app header and as the source of every icon. */
export function markSvg() {
  const glyph = markGlyph({ ink: COLOR.ink, accent: COLOR.accent });
  return doc(`0 0 ${VIEW} ${VIEW}`, 'PERMA mark', 'P-shaped iris with a teal lens core.', glyph);
}

/** Tile icon: teal rounded square with a white glyph. Favicon and PWA "any" icons. */
export function tileSvg() {
  const tile = `<rect width="${VIEW}" height="${VIEW}" rx="${TILE_RADIUS}" fill="${COLOR.accent}"/>`;
  return doc(`0 0 ${VIEW} ${VIEW}`, 'PERMA', 'PERMA mark on a teal tile.', tile + markGlyph({ ink: COLOR.surface, accent: COLOR.surface }));
}

/** Full-bleed teal square with no transparency, glyph scaled by `scale`. Maskable and apple-touch sources. */
export function bleedSvg(scale) {
  const tile = `<rect width="${VIEW}" height="${VIEW}" fill="${COLOR.accent}"/>`;
  return doc(`0 0 ${VIEW} ${VIEW}`, 'PERMA', 'PERMA mark on a full teal square.', tile + markGlyph({ ink: COLOR.surface, accent: COLOR.surface, scale }));
}

/**
 * Mark + wordmark on one line, as a body fragment with its own size. `mono` uses currentColor for every ink.
 * The wordmark's cap height is centred on the mark's bounding box.
 */
export function lockupBody({ wordmark, mono = false }) {
  const ink = mono ? 'currentColor' : COLOR.ink;
  const accent = mono ? 'currentColor' : COLOR.accent;
  const h = BOUNDS.height;
  const glyph = markGlyph({ ink, accent, cx: BOUNDS.width / 2, cy: h / 2 });
  const wordX = BOUNDS.width + WORDMARK_GAP;
  const baseline = h / 2 + wordmark.capHeight / 2;
  const word = `<path transform="translate(${wordX} ${baseline})" fill="${ink}" d="${wordmark.d}"/>`;
  return { body: glyph + word, width: wordX + wordmark.width, height: h };
}

/** Horizontal lockup SVG (mark + PERMA). */
export function lockupSvg({ wordmark, mono = false }) {
  const { body, width, height } = lockupBody({ wordmark, mono });
  const desc = mono ? 'PERMA logo in one ink.' : 'PERMA logo: P-shaped iris mark with the PERMA wordmark.';
  return doc(`0 0 ${Math.ceil(width)} ${Math.ceil(height)}`, 'PERMA', desc, body);
}

/** 1200 x 630 social card: lockup and tagline on the canvas colour. Outlines only. */
export function ogSvg({ wordmark, tagline }) {
  const { body } = lockupBody({ wordmark });
  const bg = `<rect width="1200" height="630" fill="${COLOR.canvas}"/>`;
  // Block = lockup (46 * 2.4 = 110 units) + 40 gap + tagline cap height (21.3 * 1.6 = 34). Centred vertically on 630.
  const LOCKUP_TOP = 223;
  const TAGLINE_BASELINE = 407;
  const logo = `<g transform="translate(120 ${LOCKUP_TOP}) scale(2.4)">${body}</g>`;
  const line = `<path transform="translate(120 ${TAGLINE_BASELINE}) scale(1.6)" fill="${COLOR.ink}" d="${tagline.d}"/>`;
  return doc('0 0 1200 630', 'PERMA social card', 'PERMA logo and tagline on the canvas colour.', bg + logo + line);
}
