import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { msToSeconds, planRouteTransition, reduceFromPreference, EASE_OUT } from '../core/motion';

/**
 * Fallback outlet fade for browsers without document.startViewTransition.
 * Opacity only, 220 ms (100 ms when reduced). Render it only when the route plan is 'fallback-fade'.
 * The caller remounts it per route by passing a key.
 */
export function RouteFade({ children }: { children: ReactNode }) {
  const reduce = reduceFromPreference(useReducedMotion());
  const { durationMs } = planRouteTransition({ reducedMotion: reduce });
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: msToSeconds(durationMs), ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
