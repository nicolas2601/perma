import { useReducedMotion, type Transition } from 'motion/react';

export const MOTION_MS = { press: 120, expand: 220, sheet: 240, exit: 180, reduced: 100 } as const;
export const PRESS_SCALE = 0.97;
export const REDUCED_PRESS_OPACITY = 0.85;

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const toSeconds = (ms: number): number => ms / 1000;

export const pressTransition: Transition = { duration: toSeconds(MOTION_MS.press), ease: EASE_OUT };
export const reducedTransition: Transition = { duration: toSeconds(MOTION_MS.reduced) };
export const sheetEnterTransition: Transition = { type: 'spring', duration: toSeconds(MOTION_MS.sheet), bounce: 0 };
export const sheetExitTransition: Transition = { duration: toSeconds(MOTION_MS.exit), ease: EASE_OUT };
export const overlayTransition: Transition = { duration: toSeconds(MOTION_MS.sheet), ease: EASE_OUT };

export type TapTarget = { scale?: number; opacity?: number };

/** Press feedback: scale(0.97) in 120 ms, or a 100 ms opacity crossfade under reduced motion. */
export function usePressMotion(inert: boolean): { whileTap: TapTarget | undefined; transition: Transition } {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      whileTap: inert ? undefined : { opacity: REDUCED_PRESS_OPACITY },
      transition: reducedTransition,
    };
  }
  return {
    whileTap: inert ? undefined : { scale: PRESS_SCALE },
    transition: pressTransition,
  };
}
