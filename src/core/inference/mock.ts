import {
  InferenceError,
  type AnalyzeRequest,
  type InferenceClient,
  type InferenceResult,
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
import { analyzeResponseSchema, simulateToneResponseSchema, toAnalysisResult, toToneSimulation } from './analyzeContract';
import { AnalyzeEndpointMissing } from './errors';
import { loadAnalyzeCapture, loadPredictMocoBaseCapture, loadSimulateToneCapture } from './captures';
import { parseOrInvalid, predictResponseSchema, toInferenceResult } from './contract';

export const SIMULATED_WARNING = 'simulated-model';
const SLOW_MIN_MS = 14_000;
const SLOW_MAX_MS = 16_000;
const FAILURE_DELAY_MS = 600;

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
  /** Overrides the seeded 14-16 s delay of the `slow` scenario. */
  slowDelayMs?: number;
  /** Delay before a simulated failure, so the UI state is reachable without a real timeout. */
  failureDelayMs?: number;
}

/**
 * Mock client for the mock build. It never invents clinical values: every result is a replay of a
 * REAL captured API response (fixtures/api/*.json). With no capture the capability reports unavailable.
 * Only the failure scenarios and the slow delay are simulated; they carry `source: 'mock'`.
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
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    const random = mulberry32(fnv1a(bytes));
    const scenario = this.options.scenario ?? 'success';
    const delayMs = this.delayFor(scenario, random);
    await waitFor(delayMs, request.signal);
    if (isFailureScenario(scenario)) {
      throw new InferenceError(scenario, FAILURE_MESSAGES[scenario]);
    }
    const replayed = await replayMocoBase();
    if (replayed === null) {
      throw new InferenceError('server-error', 'No captured predict replay is available in this mock build');
    }
    return replayed;
  }

  /**
   * Replays a REAL captured analyze response. With no capture the explainability layer is unavailable:
   * AnalyzeEndpointMissing makes the caller fall back to predict, exactly as against a backend without /api/analyze.
   */
  async analyze(request: AnalyzeRequest): Promise<InferenceResult> {
    const capture = await loadAnalyzeCapture();
    if (capture === null) throw new AnalyzeEndpointMissing();
    const base = await this.predict(request);
    const body = parseOrInvalid(analyzeResponseSchema, capture, 'analyze-replay');
    return asMock(toAnalysisResult(body, base.latencyMs));
  }

  /** Replays a REAL captured tone simulation for the requested stop. Never computes pixels or values itself. */
  async simulateTone(request: SimulateToneRequest): Promise<ToneSimulation> {
    if (!isToneStop(request.deltaL)) {
      throw new RangeError(`Delta ${request.deltaL} is not a tone stop`);
    }
    const capture = await loadSimulateToneCapture(request.deltaL);
    if (capture === null) {
      throw new InferenceError('file-unavailable', `No captured simulate-tone replay for ΔL* ${request.deltaL}`);
    }
    const body = parseOrInvalid(simulateToneResponseSchema, capture, 'simulate-tone-replay');
    return { ...toToneSimulation(body), source: 'mock' };
  }

  private delayFor(scenario: MockScenario, random: () => number): number {
    if (scenario === 'success') return 0;
    if (scenario === 'slow') return this.options.slowDelayMs ?? seededSlowDelay(random);
    return this.options.failureDelayMs ?? FAILURE_DELAY_MS;
  }
}

/** Marks replayed real data as mock: the UI keeps its "Modelo simulado" badge in mock builds only. */
function asMock(result: InferenceResult): InferenceResult {
  const { segmentation } = result;
  return {
    ...result,
    source: 'mock',
    warnings: [SIMULATED_WARNING],
    segmentation: segmentation && { ...segmentation, source: 'mock' },
  };
}

async function replayMocoBase(): Promise<InferenceResult | null> {
  const capture = await loadPredictMocoBaseCapture();
  if (capture === null) return null;
  const body = parseOrInvalid(predictResponseSchema, capture, 'predict-replay');
  return asMock(toInferenceResult(body, 0));
}

function seededSlowDelay(random: () => number): number {
  return SLOW_MIN_MS + Math.floor(random() * (SLOW_MAX_MS - SLOW_MIN_MS + 1));
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
