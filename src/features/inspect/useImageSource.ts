import { useMemo } from 'react';
import type { ExamImage } from '@/core/exam/contract';
import referenceUrl from '@/assets/images/reference-tschandl-600.webp';

/**
 * One object URL per original Blob, reused across renders and StrictMode re-runs (an
 * effect-based create/revoke pair would revoke the URL that the memo still hands out).
 * Known limit: URLs live until page unload; the discard flow (G12) owns revocation later.
 */
const urls = new WeakMap<Blob, string>();

function objectUrlFor(blob: Blob): string {
  const cached = urls.get(blob);
  if (cached) return cached;
  const created = URL.createObjectURL(blob);
  urls.set(blob, created);
  return created;
}

/** Object URL for the ORIGINAL bytes (unmodified viewer, G9). */
export function useObjectUrl(image: ExamImage | null): string | null {
  return useMemo(() => (image ? objectUrlFor(image.original) : null), [image]);
}

/** Public reference photo is the only image the mock/demo path may show (attribution required). */
export const PUBLIC_REFERENCE_URL: string = referenceUrl;

export function isReferenceImage(image: ExamImage | null): boolean {
  return image === null || image.origin === 'sample';
}
