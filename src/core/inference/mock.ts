import {
  CLASS_CODES,
  InferenceError,
  type AnalyzeRequest,
  type ClassCode,
  type InferenceClient,
  type InferenceResult,
  type InferenceMode,
  type ModelId,
  type ModelIdentity,
  type PredictRequest,
  type RecoveryScenario,
  type SimulateToneRequest,
  type ToneSimulation,
} from './types';
import { isFailureScenario, type MockScenario } from './mockScenario';
import { fnv1a, mulberry32 } from './seededRandom';
import { isToneStop } from '@/core/explain/toneCache';
import {
  SIMULATED_IMAGE_HEIGHT,
  SIMULATED_IMAGE_WIDTH,
  shiftPhotometry,
  simulatedExplainability,
} from './mockExplain';

export const SIMULATED_WARNING = 'simulated-model';
const SLOW_MIN_MS = 14_000;
const SLOW_MAX_MS = 16_000;
const FAILURE_DELAY_MS = 600;
const SCORE_DECIMALS = 6;
const SCORE_SCALE = 10 ** SCORE_DECIMALS;
const ENCODER = new TextEncoder();
const BASE64_CHUNK = 0x8000;

const FAILURE_MESSAGES: Record<RecoveryScenario, string> = {
  permission: 'Simulated: permission denied',
  offline: 'Simulated: offline',
  'server-error': 'Simulated: server error',
  timeout: 'Simulated: timeout',
  'invalid-response': 'Simulated: invalid response',
  'rate-limit': 'Simulated: rate limit',
  'file-unavailable': 'Simulated: file unavailable',
  'export-unavailable': 'Simulated: export unavailable',
};

export interface MockClientOptions {
  defaultModel: ModelId;
  scenario?: MockScenario;
  /** Overrides the seeded 6-12 s delay of the `slow` scenario. */
  slowDelayMs?: number;
  /** Delay before a simulated failure, so the UI state is reachable without a real timeout. */
  failureDelayMs?: number;
}

/**
 * Deterministic simulator. Same image bytes + model + mode always give the same scores.
 * Every result is `source: 'mock'` with a simulated identity and never claims a real sha256.
 * The scenario applies to predict only; status always reports the simulated identity.
 */
export class MockInferenceClient implements InferenceClient {
  readonly source = 'mock' as const;

  constructor(private readonly options: MockClientOptions) {}

  async status(): Promise<ModelIdentity> {
    return {
      modelId: `simulated-${this.options.defaultModel}`,
      sha256: null,
      sha256Verified: false,
      recipe: 'simulated',
      release: null,
    };
  }

  async predict(request: PredictRequest): Promise<InferenceResult> {
    const model = request.model ?? this.options.defaultModel;
    const mode = request.mode ?? 'base';
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    const seed = fnv1a(ENCODER.encode(`${model}|${mode}`), fnv1a(bytes));
    const random = mulberry32(seed);
    const scenario = this.options.scenario ?? 'success';
    const delayMs = this.delayFor(scenario, random);
    await waitFor(delayMs, request.signal);
    if (isFailureScenario(scenario)) {
      throw new InferenceError(scenario, FAILURE_MESSAGES[scenario]);
    }
    return simulatedResult(model, mode, random, delayMs);
  }

  /** Simulated classification plus simulated segmentation/photometry. Same failure scenarios as predict. */
  async analyze(request: AnalyzeRequest): Promise<InferenceResult> {
    const base = await this.predict(request);
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    const { segmentation, photometry } = simulatedExplainability(fnv1a(bytes));
    return { ...base, segmentation, photometry };
  }

  /** Simulated tone shift: the image is echoed unchanged; only the photometry moves with ΔL*. */
  async simulateTone(request: SimulateToneRequest): Promise<ToneSimulation> {
    if (!isToneStop(request.deltaL)) {
      throw new RangeError(`Delta ${request.deltaL} is not a tone stop`);
    }
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    const { photometry } = simulatedExplainability(fnv1a(bytes));
    return {
      source: 'mock',
      deltaL: request.deltaL,
      imageWebpBase64: bytesToBase64(bytes),
      width: SIMULATED_IMAGE_WIDTH,
      height: SIMULATED_IMAGE_HEIGHT,
      clippedFraction: 0,
      photometry: shiftPhotometry(photometry, request.deltaL),
    };
  }

  private delayFor(scenario: MockScenario, random: () => number): number {
    if (scenario === 'success') return 0;
    if (scenario === 'slow') return this.options.slowDelayMs ?? seededSlowDelay(random);
    return this.options.failureDelayMs ?? FAILURE_DELAY_MS;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

function seededSlowDelay(random: () => number): number {
  return SLOW_MIN_MS + Math.floor(random() * (SLOW_MAX_MS - SLOW_MIN_MS + 1));
}

function simulatedResult(
  model: ModelId,
  mode: InferenceMode,
  random: () => number,
  latencyMs: number,
): InferenceResult {
  const scores = Object.fromEntries(
    CLASS_CODES.map((code) => [code, Math.round(random() * SCORE_SCALE) / SCORE_SCALE]),
  ) as Record<ClassCode, number>;
  return {
    source: 'mock',
    model,
    mode,
    identity: {
      modelId: `simulated-${model}`,
      sha256: null,
      sha256Verified: false,
      recipe: 'simulated',
      release: null,
    },
    scores,
    latencyMs,
    warnings: [SIMULATED_WARNING],
  };
}

/** Resolves after `ms`, or rejects with the caller's abort reason as soon as the signal fires. */
function waitFor(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
