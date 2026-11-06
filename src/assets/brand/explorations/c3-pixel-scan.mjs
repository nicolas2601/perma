// Concept 3 "pixel scan": a 5x5 cell grid where a P is sampled as filled pixels; the scan row is accent.
// Mechanism: an image sampled into cells; the P is what survives the sampling.
import { wrap } from './lib.mjs';
const P = ['11110', '10001', '11110', '10000', '10000'];
const CELL = 8, GAP = 3, ORIGIN = 9;
export function build({ ink = 'currentColor', accent = '#006779', tile = false, tileFill = '#e8eeec', scanRow = 1 } = {}) {
  const cells = [];
  P.forEach((row, r) => [...row].forEach((v, c) => {
    if (v !== '1') return;
    const x = ORIGIN + c * (CELL + GAP), y = ORIGIN + r * (CELL + GAP);
    cells.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="1.5" fill="${r === scanRow ? accent : ink}"/>`);
  }));
  return wrap({ title: 'PERMA pixel scan', desc: 'A P sampled as a grid of square pixels, with one scan row in teal.', body: cells.join(''), tile, tileFill });
}
