import { SCORE_MAX, SCORE_MIN, toRawScore } from './score';

export type ScoreLocale = 'es' | 'en';

export type ScoreRowProps = {
  label: string;
  /** Raw model score in [0, 1]. Rendered as a decimal, never as a percentage. */
  score: number;
  locale: ScoreLocale;
};

const INTL_TAG: Record<ScoreLocale, string> = { es: 'es-CO', en: 'en-US' };
const DECIMALS = 2;

export function formatRawScore(score: number, locale: ScoreLocale): string {
  return new Intl.NumberFormat(INTL_TAG[locale], {
    minimumFractionDigits: DECIMALS,
    maximumFractionDigits: DECIMALS,
  }).format(score);
}

/**
 * One raw score on the shared 0-1 horizontal scale. The fill is a static
 * scaleX transform (no count-up, no animation). Single neutral accent.
 */
export function ScoreRow({ label, score, locale }: ScoreRowProps) {
  const raw = toRawScore(score);
  const text = formatRawScore(raw, locale);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-label text-ink">{label}</span>
        <span className="text-label tabular-nums text-ink">{text}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={SCORE_MIN}
        aria-valuemax={SCORE_MAX}
        aria-valuenow={raw}
        aria-valuetext={text}
        className="relative h-2 w-full overflow-hidden rounded-full border border-solid border-line bg-subtle"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 origin-left bg-accent"
          style={{ transform: `scaleX(${raw})` }}
        />
      </div>
      <div aria-hidden="true" className="flex justify-between text-caption text-muted">
        <span>{formatRawScore(SCORE_MIN, locale)}</span>
        <span>{formatRawScore(SCORE_MAX, locale)}</span>
      </div>
    </div>
  );
}
