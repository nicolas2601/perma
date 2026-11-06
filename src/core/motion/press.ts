import { EASE_OUT, MOTION_MS, PRESS_REDUCED_OPACITY, PRESS_SCALE } from './tokens';

/** Hover visuals only apply to fine pointers that can really hover. */
export const PRESS_HOVER_QUERY = '(hover: hover) and (pointer: fine)';

export interface PressFeedback {
  readonly scale: number;
  readonly opacity: number;
  readonly durationMs: number;
  readonly easing: readonly number[];
}

export interface PressInput {
  readonly disabled: boolean;
  readonly reducedMotion: boolean;
}

/**
 * Press contract: scale 0.97 in 140 ms ease-out. Disabled controls never scale.
 * Reduced motion swaps the scale for a 100 ms opacity feedback, so the press is still visible.
 */
export function resolvePressFeedback({ disabled, reducedMotion }: PressInput): PressFeedback {
  if (disabled) return { scale: 1, opacity: 1, durationMs: 0, easing: EASE_OUT };
  if (reducedMotion) {
    return { scale: 1, opacity: PRESS_REDUCED_OPACITY, durationMs: MOTION_MS.fade, easing: EASE_OUT };
  }
  return { scale: PRESS_SCALE, opacity: 1, durationMs: MOTION_MS.press, easing: EASE_OUT };
}

export function canHover(matchMedia: (query: string) => { readonly matches: boolean }): boolean {
  return matchMedia(PRESS_HOVER_QUERY).matches;
}
