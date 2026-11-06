import {
  CLASS_CODES,
  type ClassCode,
  type InferenceClient,
  type InferenceMode,
  type InferenceResult,
  type ModelId,
  type ModelIdentity,
  type PredictRequest,
  InferenceError,
  type RecoveryScenario,
} from '@/core/inference/types';
import type { MockScenario } from '@/features/desk/mockScenario';
import { abortError } from './abort';

const FAST_DELAY_MS = 300;
const SLOW_MIN_MS = 6000;
const SLOW_SPAN_MS = 6000;
const MOCK_MODEL: ModelId = 'A71';
const SEED_MULTIPLIER = 1_103_515_245;
const SEED_INCREMENT = 12_345;
const SEED_MASK = 0x7fffffff;
const SCORE_DECIMALS = 1000;

/** Mapping from mock scenario to the recovery scenario it produces. */
const FAILURE_BY_SCENARIO: Partial<Record<MockScenario, RecoveryScenario>> = {
  offline: 'offline',
  'server-error': 'server-error',
  'invalid-response': 'invalid-response',
  'rate-limit': 'rate-limit',
  permission: 'permission',
};

/** Resolves after `ms`, or rejects with AbortError as soon as the signal aborts. */
function waitFor(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

/** Never resolves; only the caller's deadline or an abort ends it (timeout scenario). */
function untilAborted(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    signal?.addEventListener('abort', () => reject(abortError()), { once: true });
  });
}

/** Deterministic pseudo-random generator (LCG) seeded from the upload size. */
function seededScores(seed: number): Record<ClassCode, number> {
  let state = seed & SEED_MASK;
  const next = (): number => {
    state = (state * SEED_MULTIPLIER + SEED_INCREMENT) & SEED_MASK;
    return state / SEED_MASK;
  };
  const scores = {} as Record<ClassCode, number>;
  for (const code of CLASS_CODES) {
    scores[code] = Math.round(next() * SCORE_DECIMALS) / SCORE_DECIMALS;
  }
  return scores;
}

function slowDelayMs(seed: number): number {
  return SLOW_MIN_MS + (seed % SLOW_SPAN_MS);
}

function buildResult(model: ModelId, mode: InferenceMode, seed: number): InferenceResult {
  return {
    source: 'mock',
    model,
    mode,
    identity: { modelId: 'mock-simulado', sha256: null, sha256Verified: null, recipe: null, release: null },
    scores: seededScores(seed),
    latencyMs: 0,
    warnings: [],
  };
}

/**
 * Mock client behind `?mock=<scenario>`. Every value is labelled source "mock" and
 * must never be exported as a real result. Deterministic for the same upload size.
 */
export class FakeInferenceClient implements InferenceClient {
  readonly source = 'mock' as const;

  constructor(private readonly scenario: MockScenario) {}

  async status(): Promise<ModelIdentity> {
    return { modelId: 'mock-simulado', sha256: null, sha256Verified: null, recipe: null, release: null };
  }

  async predict(request: PredictRequest): Promise<InferenceResult> {
    const model = request.model ?? MOCK_MODEL;
    const mode = request.mode ?? 'base';
    const seed = request.file.size;
    const failure = FAILURE_BY_SCENARIO[this.scenario];
    if (failure) throw new InferenceError(failure, `mock scenario ${this.scenario}`);
    if (this.scenario === 'timeout') await untilAborted(request.signal);
    const delay = this.scenario === 'slow' ? slowDelayMs(seed) : FAST_DELAY_MS;
    await waitFor(delay, request.signal);
    return buildResult(model, mode, seed);
  }
}
