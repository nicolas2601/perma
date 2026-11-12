import type { Transition, Variant } from 'motion/react';
import { EASE_OUT, ENTRY_OFFSET_PX, MOTION_MS, msToSeconds } from './tokens';

export interface HomeEntryVariants {
  readonly container: { hidden: Variant; show: Variant };
  readonly item: { hidden: Variant; show: Variant };
}

/**
 * One stagger sequence per Home mount: 80 ms between children, opacity plus 12 px.
 * Reduced: no stagger, no offset, a 100 ms opacity crossfade.
 */
export function homeEntryVariants(reducedMotion: boolean): HomeEntryVariants {
  if (reducedMotion) {
    const fade: Transition = { duration: msToSeconds(MOTION_MS.fade), ease: EASE_OUT };
    return {
      container: { hidden: {}, show: { transition: { staggerChildren: 0, delayChildren: 0 } } },
      item: { hidden: { opacity: 0 }, show: { opacity: 1, transition: fade } },
    };
  }
  const entry: Transition = { duration: msToSeconds(MOTION_MS.entry), ease: EASE_OUT };
  return {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: msToSeconds(MOTION_MS.stagger), delayChildren: 0 } },
    },
    item: {
      hidden: { opacity: 0, transform: `translateY(${ENTRY_OFFSET_PX}px)` },
      show: { opacity: 1, transform: 'translateY(0px)', transition: entry },
    },
  };
}
