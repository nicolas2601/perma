/** Discrete ΔL* stops offered by the tone-robustness audit. Delta 0 shows the original and never calls the API. */
export const TONE_STOPS = [-16, -8, 0, 8, 16] as const;
export type ToneStop = (typeof TONE_STOPS)[number];

const SIGN_FOR: Record<'pos' | 'neg' | 'zero', string> = { pos: '+', neg: '−', zero: '' };

export function isToneStop(value: number): value is ToneStop {
  return (TONE_STOPS as readonly number[]).includes(value);
}

/** aria-valuetext, e.g. "ΔL* −8 (simulación)". The suffix comes from copy so ES and EN stay in parity. */
export function toneStopLabel(delta: ToneStop, suffix = '(simulación)'): string {
  const sign = SIGN_FOR[deltaSign(delta)];
  return `ΔL* ${sign}${Math.abs(delta)} ${suffix}`;
}

function deltaSign(delta: number): 'pos' | 'neg' | 'zero' {
  if (delta > 0) return 'pos';
  if (delta < 0) return 'neg';
  return 'zero';
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
