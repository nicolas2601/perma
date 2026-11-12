import type { ExamImage } from '@/core/exam/contract';

/** Human label for where the image came from. Reference images are always named as such. */
export function reviewSource(image: ExamImage | null, t: (key: string) => string): string {
  if (image === null) return t('modalityNone');
  return image.origin === 'sample' ? t('modalityReference') : t('modalitySession');
}
