import { MOTION_MS } from './tokens';

export type AccordionRows = '0fr' | '1fr';

export interface AccordionMotion {
  readonly property: 'grid-template-rows';
  readonly durationMs: number;
}

/**
 * Height animates through grid-template-rows (0fr to 1fr), so no JS measuring is needed.
 * The CSS in src/motion/motion.css reads the same duration through --motion-accordion.
 * Reduced: the same open/close change in a 100 ms crossfade-length transition.
 */
export function resolveAccordionMotion(reducedMotion: boolean): AccordionMotion {
  return {
    property: 'grid-template-rows',
    durationMs: reducedMotion ? MOTION_MS.fade : MOTION_MS.accordion,
  };
}

export function accordionRows(open: boolean): AccordionRows {
  return open ? '1fr' : '0fr';
}
