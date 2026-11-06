/**
 * Soft tints: navigation and category identity only (exam phase, section, step).
 * Never use a tint to express model output, risk or any clinical meaning.
 * Class names are literal strings so Tailwind generates them.
 */
export const TINTS = ['mint', 'sky', 'butter', 'blush', 'lilac'] as const;
export type Tint = (typeof TINTS)[number];
export type TintOrNeutral = Tint | 'neutral';

export const TINT_BG: Record<TintOrNeutral, string> = {
  mint: 'bg-tint-mint',
  sky: 'bg-tint-sky',
  butter: 'bg-tint-butter',
  blush: 'bg-tint-blush',
  lilac: 'bg-tint-lilac',
  neutral: 'bg-subtle',
};

export const TINT_INK: Record<TintOrNeutral, string> = {
  mint: 'text-deep-mint',
  sky: 'text-deep-sky',
  butter: 'text-deep-butter',
  blush: 'text-deep-blush',
  lilac: 'text-deep-lilac',
  neutral: 'text-ink',
};

/** Exam phases mapped to their navigation tint (Revisión has no tint and stays neutral). */
export const PHASE_TINT = {
  contexto: 'sky',
  imagen: 'mint',
  analisis: 'butter',
  resultado: 'lilac',
  observaciones: 'blush',
  revision: 'neutral',
} as const satisfies Record<string, TintOrNeutral>;
