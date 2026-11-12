import { m, useReducedMotion } from 'motion/react';
import { indicatorSpring, msToSeconds, MOTION_MS, reduceFromPreference } from '../core/motion';

export const NAV_INDICATOR_LAYOUT_ID = 'nav-indicator';

export type NavIndicatorMode =
  | { readonly kind: 'layout'; readonly layoutId: string }
  | { readonly kind: 'fade'; readonly durationMs: number };

/**
 * layoutId projection is disabled under reduced motion (MotionConfig reducedMotion="user"),
 * so the indicator would jump with no feedback. The fade branch keeps a 100 ms crossfade.
 */
export function resolveNavIndicatorMode(reducedMotion: boolean): NavIndicatorMode {
  if (reducedMotion) return { kind: 'fade', durationMs: MOTION_MS.fade };
  return { kind: 'layout', layoutId: NAV_INDICATOR_LAYOUT_ID };
}

/**
 * Render inside the active nav item only. With layout mode, Motion moves the same layoutId
 * element from the previous item to the new one.
 */
export function NavIndicator({ activeId }: { activeId: string }) {
  const reduce = reduceFromPreference(useReducedMotion());
  const mode = resolveNavIndicatorMode(reduce);
  const className = 'absolute inset-0 rounded-full bg-accent/10';
  if (mode.kind === 'fade') {
    return (
      <m.span
        key={activeId}
        aria-hidden
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: msToSeconds(mode.durationMs) }}
      />
    );
  }
  return <m.span layoutId={mode.layoutId} aria-hidden className={className} transition={indicatorSpring} />;
}
