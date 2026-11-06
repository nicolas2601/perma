// Concept 1 refined ("iris P" v2): stem top aligned to the bowl's outer top (y=8), bowl aperture gap widened
// so it still reads as open at 16 px. Same mechanism as v1: a P whose bowl is an iris around a teal lens core.
import { wrap } from './lib.mjs';
const CX = 36, CY = 24, R = 12, STROKE = 8;
const CIRC = 2 * Math.PI * R;
const GAP = 16; // gap length in user units (v1 was ~13.4)
export function build({ ink = 'currentColor', accent = '#006779', tile = false, tileFill = '#e8eeec' } = {}) {
  const top = CY - R - STROKE / 2;                 // bowl outer top
  const body = `<rect x="14" y="${top}" width="8" height="${54 - top}" rx="2" fill="${ink}"/>` +
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${ink}" stroke-width="${STROKE}" stroke-dasharray="${(CIRC - GAP).toFixed(2)} ${GAP}" transform="rotate(92 ${CX} ${CY})"/>` +
    `<circle cx="${CX}" cy="${CY}" r="4" fill="${accent}"/>`;
  return wrap({ title: 'PERMA iris P', desc: 'Stem and ring bowl forming a P; the bowl has one aperture gap and a teal lens core.', body, tile, tileFill });
}
