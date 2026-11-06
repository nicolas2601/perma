import { LazyMotion, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

const loadFeatures = () => import('./motionFeatures').then((module) => module.default);

/**
 * App root. MotionConfig drops transform and layout animations for reduced motion;
 * LazyMotion keeps the animation engine out of the initial bundle (components use `m`).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
