// Concept 4 "tile lens": home-art language (rotated rounded square + circle). withPlus=true builds the rejected
// variant with a plus, kept only to prove the medical-cross reading.
import { wrap } from './lib.mjs';
export function build({ ink = 'currentColor', accent = '#006779', tile = false, tileFill = '#e8eeec', withPlus = false } = {}) {
  const plus = withPlus ? `<path d="M32 22v20M22 32h20" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>` : '';
  const body = `<rect x="16" y="16" width="32" height="32" rx="7" fill="none" stroke="${ink}" stroke-width="4" transform="rotate(45 32 32)"/>` +
    `<circle cx="32" cy="32" r="9" fill="${accent}"/>` + plus;
  return wrap({ title: 'PERMA tile lens', desc: 'Rotated rounded square framing a teal circle.', body, tile, tileFill });
}
