// Concept 1 "iris P": stem + ring bowl with one aperture gap; the lens core is the accent dot.
// Mechanism: a P whose bowl is a camera iris (open blade) around a focus point.
import { wrap } from './lib.mjs';
export function build({ ink = 'currentColor', accent = '#006779', tile = false, tileFill = '#e8eeec' } = {}) {
  const body = `<rect x="14" y="10" width="8" height="44" rx="2" fill="${ink}"/>` +
    `<circle cx="36" cy="24" r="12" fill="none" stroke="${ink}" stroke-width="8" stroke-dasharray="62 13.4" transform="rotate(92 36 24)"/>` +
    `<circle cx="36" cy="24" r="4" fill="${accent}"/>`;
  return wrap({ title: 'PERMA iris P', desc: 'Stem and ring bowl forming a P; the bowl has one aperture gap and a teal lens core.', body, tile, tileFill });
}
