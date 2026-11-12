import type { ItaCategory } from '@/core/inference/types';

export type ExplainLocale = 'es' | 'en';

const ITA_LABELS: Record<ItaCategory, Record<ExplainLocale, string>> = {
  very_light: { es: 'Muy clara', en: 'Very light' },
  light: { es: 'Clara', en: 'Light' },
  intermediate: { es: 'Intermedia', en: 'Intermediate' },
  tan: { es: 'Bronceada', en: 'Tan' },
  brown: { es: 'Morena', en: 'Brown' },
  dark: { es: 'Oscura', en: 'Dark' },
};

const INTL_TAG: Record<ExplainLocale, string> = { es: 'es-CO', en: 'en-US' };
const ITA_DECIMALS = 1;
const PERCENT_SCALE = 100;
const NBSP = '\u00A0';

export function itaCategoryLabel(category: ItaCategory, locale: ExplainLocale): string {
  return ITA_LABELS[category][locale];
}

/** One decimal with the locale separator (Spanish: 1,5 for 1.5). Non-finite values are refused, never printed. */
export function formatOneDecimal(value: number, locale: ExplainLocale): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Value must be finite, received ${value}`);
  }
  return new Intl.NumberFormat(INTL_TAG[locale], {
    minimumFractionDigits: ITA_DECIMALS,
    maximumFractionDigits: ITA_DECIMALS,
  }).format(value);
}

/** ITA in degrees with one decimal, locale decimal separator. */
export function formatItaDegrees(degrees: number, locale: ExplainLocale): string {
  return `${formatOneDecimal(degrees, locale)}°`;
}

/** Fraction in [0, 1] as a locale percentage with one decimal (Spanish: "42,8 %"). Non-finite or out-of-range values are refused. */
export function formatPercent(fraction: number, locale: ExplainLocale): string {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new RangeError(`Fraction must be within [0, 1], received ${fraction}`);
  }
  const number = new Intl.NumberFormat(INTL_TAG[locale], {
    minimumFractionDigits: ITA_DECIMALS,
    maximumFractionDigits: ITA_DECIMALS,
  }).format(fraction * PERCENT_SCALE);
  return locale === 'es' ? `${number}${NBSP}%` : `${number}%`;
}
