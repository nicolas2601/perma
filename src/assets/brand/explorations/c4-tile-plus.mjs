// Rejected variant of concept 4 with the plus from the Home art language, rendered only to test the medical-cross reading.
import { build as base } from './c4-tile-lens.mjs';
export function build(opts = {}) {
  return base({ ...opts, withPlus: true });
}
