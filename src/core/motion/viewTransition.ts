import { MOTION_MS } from './tokens';
import { prefersReducedMotion } from './reducedMotion';

export type RouteTransitionPlan =
  | { readonly kind: 'view-transition'; readonly durationMs: number }
  | { readonly kind: 'fallback-fade'; readonly durationMs: number };

export interface RouteTransitionEnv {
  readonly reducedMotion: boolean;
  /** Present only where the View Transitions API exists. */
  readonly startViewTransition?: (update: () => void) => void;
}

/**
 * Chooses the route transition without running it.
 * Default: View Transition, 220 ms. Reduced: View Transition with a 100 ms crossfade
 * (the global CSS clamps the pseudo-element duration, and the default root animation is opacity-only).
 * No API: the update runs immediately and the caller fades the outlet with Motion for the same duration.
 */
export function planRouteTransition(env: RouteTransitionEnv): RouteTransitionPlan {
  const durationMs = env.reducedMotion ? MOTION_MS.fade : MOTION_MS.route;
  const kind = env.startViewTransition ? 'view-transition' : 'fallback-fade';
  return { kind, durationMs };
}

interface ViewTransitionDocument {
  startViewTransition?: (update: () => void) => unknown;
}

export function readRouteTransitionEnv(): RouteTransitionEnv {
  if (typeof document === 'undefined') return { reducedMotion: false };
  const doc = document as Document & ViewTransitionDocument;
  return {
    reducedMotion: prefersReducedMotion(),
    startViewTransition: doc.startViewTransition ? (update) => swallowSkipped(doc.startViewTransition?.(update)) : undefined,
  };
}

/** Runs one route update inside the planned transition. Returns the plan so the outlet can match its fallback fade. */
export function runRouteTransition(update: () => void, env: RouteTransitionEnv = readRouteTransitionEnv()): RouteTransitionPlan {
  const plan = planRouteTransition(env);
  if (plan.kind === 'view-transition' && env.startViewTransition) env.startViewTransition(update);
  else update();
  return plan;
}

/** A skipped transition (rapid navigation) rejects its promises with AbortError; that is not an app error. */
function swallowSkipped(transition: unknown): void {
  if (typeof transition !== 'object' || transition === null) return;
  const { ready, finished, updateCallbackDone } = transition as Record<string, unknown>;
  for (const promise of [ready, finished, updateCallbackDone]) {
    if (promise instanceof Promise) promise.catch(() => undefined);
  }
}
