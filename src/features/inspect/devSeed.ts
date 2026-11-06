import type { ExamCommand } from '@/core/exam/commands';
import type { ExamImage } from '@/core/exam/contract';
import type { ClassCode, InferenceResult } from '@/core/inference/types';
import { PUBLIC_REFERENCE_URL } from './useImageSource';

/**
 * DEV-ONLY seed for testing the review screens alone (`?seed=result`).
 * It loads through real commands, so the reducer rules still apply. The result is
 * a simulated mock (source "mock", badge "Modelo simulado") and is never a real output.
 */
export const SEED_PARAM = 'seed';
export const SEED_RESULT = 'result';
const SEED_SITE = 'face';
const SEED_IMAGE_NAME = 'referencia-publica.webp';

const MOCK_SCORES: Readonly<Record<ClassCode, number>> = {
  nv: 0.61,
  bkl: 0.15,
  mel: 0.09,
  bcc: 0.06,
  akiec: 0.04,
  vasc: 0.03,
  df: 0.02,
};

export const DEV_MOCK_RESULT: InferenceResult = {
  source: 'mock',
  model: 'B71',
  mode: 'base',
  identity: { modelId: 'B71 (simulado)', sha256: null, sha256Verified: null, recipe: null, release: null },
  scores: { ...MOCK_SCORES },
  latencyMs: 0,
  warnings: [],
};

/** True only in dev builds and only when the URL asks for the result seed. */
export function devSeedRequested(search: string): boolean {
  return import.meta.env.DEV && new URLSearchParams(search).get(SEED_PARAM) === SEED_RESULT;
}

async function fetchSampleImage(): Promise<ExamImage> {
  const response = await fetch(PUBLIC_REFERENCE_URL);
  const blob = await response.blob();
  return { original: blob, upload: blob, name: SEED_IMAGE_NAME, origin: 'sample' };
}

/** Command chain idle -> result. Each step is a legal transition of the reducer. */
export async function seedResultCommands(): Promise<ExamCommand[]> {
  const image = await fetchSampleImage();
  return [
    { type: 'RESET' },
    { type: 'SET_SITE', site: SEED_SITE },
    { type: 'START_CAPTURE' },
    { type: 'IMAGE_LOADED', image },
    { type: 'CONFIRM_IMAGE' },
    { type: 'CONSENT', value: true },
    { type: 'SEND' },
    { type: 'RESULT_OK', result: DEV_MOCK_RESULT },
  ];
}
