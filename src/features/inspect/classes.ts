import { CLASS_CODES, type ClassCode } from '@/core/inference/types';
import type { Locale } from '@/core/i18n/contract';

export type ClassInfo = { code: ClassCode; name: Record<Locale, string> };

/** Seven raw output classes (HAM10000 labels). Names are descriptive, not diagnostic claims. */
export const CLASS_INFO: Readonly<Record<ClassCode, ClassInfo>> = {
  nv: { code: 'nv', name: { es: 'Nevo melanocítico', en: 'Melanocytic nevus' } },
  bkl: { code: 'bkl', name: { es: 'Queratosis seborreica o lesión queratósica benigna', en: 'Seborrheic or benign keratosis' } },
  mel: { code: 'mel', name: { es: 'Melanoma', en: 'Melanoma' } },
  bcc: { code: 'bcc', name: { es: 'Carcinoma basocelular', en: 'Basal cell carcinoma' } },
  akiec: {
    code: 'akiec',
    name: { es: 'Queratosis actínica', en: 'Actinic keratosis' },
  },
  vasc: { code: 'vasc', name: { es: 'Lesión vascular', en: 'Vascular lesion' } },
  df: { code: 'df', name: { es: 'Dermatofibroma', en: 'Dermatofibroma' } },
};

export function isClassCode(value: string): value is ClassCode {
  return (CLASS_CODES as readonly string[]).includes(value);
}

/** Classes ordered by raw score, highest first. Ties keep the canonical order. */
export function rankClasses(scores: Readonly<Record<ClassCode, number>>): ClassCode[] {
  return [...CLASS_CODES].sort((a, b) => scores[b] - scores[a]);
}
