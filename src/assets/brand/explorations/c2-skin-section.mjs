// Concept 2 "skin section": a rounded section with two layer lines; the teal dot is the examined point on the middle layer.
// Mechanism: a cross-section of stacked layers with one point of focus, no medical cross.
import { wrap } from './lib.mjs';
export function build({ ink = 'currentColor', accent = '#006779', tile = false, tileFill = '#e8eeec' } = {}) {
  const body = `<rect x="7" y="13" width="50" height="38" rx="12" fill="none" stroke="${ink}" stroke-width="4"/>` +
    `<path d="M7 25h50M7 39h50" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="32" cy="32" r="6" fill="${accent}"/>`;
  return wrap({ title: 'PERMA skin section', desc: 'Rounded section with two layer lines and one teal focus point on the middle layer.', body, tile, tileFill });
}
