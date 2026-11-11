import type { InferenceResult } from '@/core/inference/types';
import type { AnalysisMask, StoredExam } from './types';

/** Removes the lesion mask from a snapshot. The mask is returned for its own side record. */
export function splitMask(snapshot: StoredExam): { snapshot: StoredExam; mask: AnalysisMask | null } {
  const result = snapshot.result;
  const segmentation = result?.segmentation;
  if (!result || segmentation?.status !== 'ok' || segmentation.maskPngBase64 === undefined) {
    return { snapshot, mask: null };
  }
  const { maskPngBase64, ...withoutMask } = segmentation;
  const stripped: StoredExam = {
    ...snapshot,
    result: { ...result, segmentation: withoutMask as InferenceResult['segmentation'] },
  };
  if (!result.analysisId) return { snapshot: stripped, mask: null };
  return { snapshot: stripped, mask: { analysisId: result.analysisId, maskPngBase64 } };
}

/** Restores the mask only when it belongs to this exact analysis. Anything else leaves the mask absent. */
export function reattachMask(snapshot: StoredExam, mask: AnalysisMask | null): StoredExam {
  const result = snapshot.result;
  const segmentation = result?.segmentation;
  if (!result || !mask || !result.analysisId || result.analysisId !== mask.analysisId) return snapshot;
  if (segmentation?.status !== 'ok') return snapshot;
  return { ...snapshot, result: { ...result, segmentation: { ...segmentation, maskPngBase64: mask.maskPngBase64 } } };
}

export function isAnalysisMask(value: unknown): value is AnalysisMask {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<AnalysisMask>;
  return typeof candidate.analysisId === 'string' && typeof candidate.maskPngBase64 === 'string';
}
