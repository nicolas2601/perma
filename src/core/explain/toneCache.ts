/**
 * Luminance stops (ΔL*), one DDI band = 4.86 L*. ±9.73 is the whole measured phototype span.
 * Delta 0 shows the original and never calls the API.
 */
export const TONE_STOPS = [-9.73, -4.86, 0, 4.86, 9.73] as const;
export type ToneStop = (typeof TONE_STOPS)[number];

/** Copy keys for the main UI, in the same order as TONE_STOPS. Exact ΔL* values live in technical details. */
export const TONE_STEP_KEYS = [
  'toneStepMinus2',
  'toneStepMinus1',
  'toneStep0',
  'toneStepPlus1',
  'toneStepPlus2',
] as const;

export function isToneStop(value: number): value is ToneStop {
  return (TONE_STOPS as readonly number[]).includes(value);
}

export interface ToneCache<T> {
  get(delta: ToneStop): T | undefined;
  set(delta: ToneStop, value: T): void;
  clear(): void;
}

/** In-memory only: never persisted, never exported. One entry per stop. */
export function createToneCache<T>(): ToneCache<T> {
  const entries = new Map<number, T>();
  return {
    get: (delta) => entries.get(delta),
    set(delta, value) {
      if (!isToneStop(delta)) {
        throw new RangeError(`Delta ${delta} is not a tone stop`);
      }
      entries.set(delta, value);
    },
    clear: () => entries.clear(),
  };
}
