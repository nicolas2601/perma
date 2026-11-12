export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export type MatchMedia = (query: string) => { readonly matches: boolean };

/**
 * Reads the user's preference. matchMedia is injected so the helper stays testable.
 * Without a media API (SSR, very old runtimes) it answers false.
 */
export function prefersReducedMotion(matchMedia: MatchMedia | undefined = readMatchMedia()): boolean {
  return matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

/**
 * Motion's useReducedMotion returns null while the preference is unknown (SSR, first paint).
 * ADR-R3 decision: null counts as reduced, so the first paint never jumps.
 */
export function reduceFromPreference(preference: boolean | null): boolean {
  return preference !== false;
}

function readMatchMedia(): MatchMedia | undefined {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
  return (query) => window.matchMedia(query);
}
