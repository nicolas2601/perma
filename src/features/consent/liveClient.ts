import { z } from 'zod';
import {
  CLASS_CODES,
  type ClassCode,
  type InferenceClient,
  type InferenceResult,
  type ModelIdentity,
  type PredictRequest,
  InferenceError,
  type RecoveryScenario,
} from '@/core/inference/types';

const API_PREDICT_PATH = '/api/predict';
const HTTP_RATE_LIMIT = 429;
const DEFAULT_MODEL = 'A71';
const DEFAULT_MODE = 'base';
const UPLOAD_FILENAME = 'upload.jpg';

const scoreShape = Object.fromEntries(CLASS_CODES.map((code) => [code, z.number().finite()])) as Record<
  ClassCode,
  z.ZodNumber
>;

/** Minimal response contract. Undocumented upstream: anything else is `invalid-response`. */
const predictResponse = z.object({ scores: z.object(scoreShape) });

const UNKNOWN_IDENTITY: ModelIdentity = {
  modelId: DEFAULT_MODEL,
  sha256: null,
  sha256Verified: null,
  recipe: null,
  release: null,
};

function failure(scenario: RecoveryScenario, message: string, cause?: unknown): InferenceError {
  return new InferenceError(scenario, message, { cause });
}

/** Maps a non-OK HTTP status to the recovery scenario it produces. */
export function scenarioForStatus(status: number): RecoveryScenario {
  return status === HTTP_RATE_LIMIT ? 'rate-limit' : 'server-error';
}

async function parseBody(response: Response): Promise<InferenceResult['scores']> {
  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    throw failure('invalid-response', 'response is not JSON', cause);
  }
  const parsed = predictResponse.safeParse(json);
  if (!parsed.success) throw failure('invalid-response', 'response does not match the contract');
  return parsed.data.scores;
}

function buildForm(request: PredictRequest): FormData {
  const form = new FormData();
  form.append('file', request.file, UPLOAD_FILENAME);
  return form;
}

/** Live client: a single POST to the shared API (same origin in dev via the Vite proxy). */
export class LiveInferenceClient implements InferenceClient {
  readonly source = 'live' as const;

  async status(): Promise<ModelIdentity> {
    return UNKNOWN_IDENTITY;
  }

  async predict(request: PredictRequest): Promise<InferenceResult> {
    const model = request.model ?? DEFAULT_MODEL;
    const mode = request.mode ?? DEFAULT_MODE;
    const url = `${API_PREDICT_PATH}?model=${encodeURIComponent(model)}&mode=${encodeURIComponent(mode)}`;
    const started = performance.now();
    let response: Response;
    try {
      response = await fetch(url, { method: 'POST', body: buildForm(request), signal: request.signal, cache: 'no-store' });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
      throw failure(navigator.onLine === false ? 'offline' : 'server-error', 'network request failed', cause);
    }
    if (!response.ok) throw failure(scenarioForStatus(response.status), `http ${response.status}`);
    const scores = await parseBody(response);
    const latencyMs = Math.round(performance.now() - started);
    return { source: 'live', model, mode, identity: UNKNOWN_IDENTITY, scores, latencyMs, warnings: [] };
  }
}
