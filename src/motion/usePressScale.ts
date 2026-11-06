import { useReducedMotion, type Transition } from 'motion/react';
import { EASE_OUT, msToSeconds, reduceFromPreference, resolvePressFeedback } from '../core/motion';

export interface PressScaleProps {
  readonly whileTap: { scale: number; opacity: number } | undefined;
  readonly transition: Transition;
}

/** Props for a motion.button press. Disabled controls get no tap target and no scale. */
export function usePressScale(disabled: boolean): PressScaleProps {
  const reduce = reduceFromPreference(useReducedMotion());
  const feedback = resolvePressFeedback({ disabled, reducedMotion: reduce });
  return {
    whileTap: disabled ? undefined : { scale: feedback.scale, opacity: feedback.opacity },
    transition: { duration: msToSeconds(feedback.durationMs), ease: EASE_OUT },
  };
}
