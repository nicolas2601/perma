import { AnalyzeEndpointMissing } from './errors';
import type { InferenceClient, InferenceResult } from './types';

/**
 * Analyze first. If the backend has no /api/analyze (404), classify with predict and mark the
 * explainability layer as unavailable with reason endpoint_missing. Every other failure propagates.
 */
export async function analyzeWith(
  client: InferenceClient,
  file: Blob,
  signal?: AbortSignal,
): Promise<InferenceResult> {
  try {
    return await client.analyze({ file, signal });
  } catch (error) {
    if (!(error instanceof AnalyzeEndpointMissing)) throw error;
    const classified = await client.predict({ file, signal });
    return withExplainabilityUnavailable(classified);
  }
}

export function withExplainabilityUnavailable(result: InferenceResult): InferenceResult {
  return {
    ...result,
    segmentation: { status: 'unavailable', source: 'model', reason: 'endpoint_missing' },
    photometry: { status: 'unavailable', reason: 'endpoint_missing' },
  };
}
