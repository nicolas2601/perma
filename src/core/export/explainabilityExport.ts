import type { InferenceResult, PhotometryResult, SegmentationResult } from '@/core/inference/types';

/** Only live results export explainability. Simulated (mock) values are never presented as real. */
function isLive(result: InferenceResult): boolean {
  return result.source === 'live';
}

export type PhotometryExport = PhotometryResult;

export interface SegmentationExport {
  status: SegmentationResult['status'];
  source: 'model';
  reason?: string;
  areaFraction?: number;
  threshold?: number;
  identity?: {
    modelId: string;
    run: string;
    release: string;
    modelSha256: string;
    inputSize: number;
  };
}

/** Photometry summary (values and reason). The mask and the contour are never exported. */
export function photometryForExport(result: InferenceResult): PhotometryExport | null {
  if (!isLive(result) || !result.photometry) return null;
  return result.photometry;
}

export function segmentationForExport(result: InferenceResult): SegmentationExport | null {
  const segmentation = result.segmentation;
  if (!isLive(result) || !segmentation) return null;
  if (segmentation.status === 'unavailable') {
    return { status: 'unavailable', source: 'model', reason: segmentation.reason };
  }
  return {
    status: 'ok',
    source: 'model',
    areaFraction: segmentation.areaFraction,
    threshold: segmentation.threshold,
    identity: {
      modelId: segmentation.identity.modelId,
      run: segmentation.identity.run,
      release: segmentation.identity.release,
      modelSha256: segmentation.identity.modelSha256,
      inputSize: segmentation.identity.inputSize,
    },
  };
}
