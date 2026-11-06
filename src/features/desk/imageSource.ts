import type { ExamImage } from '@/core/exam/contract';
import referenceWebp from '@/assets/images/reference-tschandl-600.webp';
import { ImageRejectedError, prepareExamImage } from './imageFile';

export const SAMPLE_NAME = 'reference-tschandl-600.webp';

/** Loads the public reference image (the only sample allowed, with attribution). */
export async function loadSampleImage(): Promise<ExamImage> {
  const response = await fetch(referenceWebp);
  if (!response.ok) throw new ImageRejectedError('decode');
  const blob = await response.blob();
  return prepareExamImage(blob, { name: SAMPLE_NAME, origin: 'sample' });
}

/** Short side in px under which the quality page raises a resolution alert. */
export const MIN_SHORT_SIDE_PX = 300;

export function isLowResolution(width: number, height: number): boolean {
  return Math.min(width, height) < MIN_SHORT_SIDE_PX;
}

/** Reads intrinsic dimensions without keeping a decoded copy in memory. */
export async function measureImage(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}
