import type { Transition } from 'motion/react';
import { MOTION_MS, msToSeconds } from './tokens';

/** Sheets open from their origin. bounce 0 is explicit: the Motion default is 0.25. */
export const sheetSpring = {
  type: 'spring',
  duration: msToSeconds(MOTION_MS.sheet),
  bounce: 0,
} as const satisfies Transition;

/** Nav indicator (layoutId) uses the same settle as sheets. */
export const indicatorSpring = {
  type: 'spring',
  duration: msToSeconds(MOTION_MS.sheet),
  bounce: 0,
} as const satisfies Transition;
