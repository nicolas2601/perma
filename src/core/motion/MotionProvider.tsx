import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

/** Safety net at the app root: Motion drops transform and layout animations when the user prefers reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
