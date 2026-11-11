import type { ExamCommand } from '@/core/exam/commands';
import type { ExamImage } from '@/core/exam/contract';
import type { InferenceResult } from '@/core/inference/types';
import { PUBLIC_REFERENCE_URL } from './useImageSource';

/**
 * DEV-ONLY seed for testing the review screens alone (`?seed=result`).
 * It loads through real commands, so the reducer rules still apply. The result is
 * a simulated mock (source "mock", badge "Modelo simulado") and is never a real output.
 */
const DEV_SEED_WARNING = 'simulated-model';
export const SEED_PARAM = 'seed';
export const SEED_RESULT = 'result';
const SEED_SITE = 'face';
const SEED_IMAGE_NAME = 'referencia-publica.webp';

export function devSeedRequested(search: string): boolean {
  return import.meta.env.DEV && new URLSearchParams(search).get(SEED_PARAM) === SEED_RESULT;
}

/**
 * The result comes from the captured MOCO_HAM7 predict replay (mock builds only). Without a capture there
 * is no result to seed, so the caller seeds nothing instead of inventing one.
 */
export async function loadDevSeedResult(): Promise<InferenceResult | null> {
  const { loadPredictMocoBaseCapture } = await import('@/core/inference/captures');
  const capture = await loadPredictMocoBaseCapture();
  if (capture === null) return null;
  const { parseOrInvalid, predictResponseSchema, toInferenceResult } = await import('@/core/inference/contract');
  const body = parseOrInvalid(predictResponseSchema, capture, 'dev-seed');
  return { ...toInferenceResult(body, 0), source: 'mock', warnings: [DEV_SEED_WARNING] };
}

async function fetchSampleImage(): Promise<ExamImage> {
  const response = await fetch(PUBLIC_REFERENCE_URL);
  const blob = await response.blob();
  return { original: blob, upload: blob, name: SEED_IMAGE_NAME, origin: 'sample' };
}

/** Command chain idle -> result. Each step is a legal transition of the reducer. */
export async function seedResultCommands(): Promise<ExamCommand[]> {
  const result = await loadDevSeedResult();
  if (result === null) return [];
  const image = await fetchSampleImage();
  return [
    { type: 'RESET' },
    { type: 'SET_SITE', site: SEED_SITE },
    { type: 'START_CAPTURE' },
    { type: 'IMAGE_LOADED', image },
    { type: 'CONFIRM_IMAGE' },
    { type: 'CONSENT', value: true },
    { type: 'SEND' },
    { type: 'RESULT_OK', result },
  ];
}
