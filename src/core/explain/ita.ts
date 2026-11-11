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

export function itaCategoryLabel(category: ItaCategory, locale: ExplainLocale): string {
  return ITA_LABELS[category][locale];
}

/** ITA in degrees with one decimal, locale decimal separator. Non-finite values are refused, never printed. */
export function formatItaDegrees(degrees: number, locale: ExplainLocale): string {
  if (!Number.isFinite(degrees)) {
    throw new RangeError(`ITA must be finite, received ${degrees}`);
  }
  const number = new Intl.NumberFormat(INTL_TAG[locale], {
    minimumFractionDigits: ITA_DECIMALS,
    maximumFractionDigits: ITA_DECIMALS,
  }).format(degrees);
  return `${number}°`;
}
