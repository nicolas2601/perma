import {
  LIVE_MODEL_KEYS,
  apiErrorBodySchema,
  isServingReady,
  parseOrInvalid,
  predictResponseSchema,
  statusSchema,
  toInferenceResult,
  toModelIdentity,
  type StatusResponse,
} from './contract';
import {
  DEFAULT_TIMEOUT_MS,
  browserIsOnline,
  performRequest,
  scenarioForHttpStatus,
  type TransportOptions,
} from './transport';
import {
  InferenceError,
  type InferenceClient,
  type InferenceResult,
  type ModelId,
  type ModelIdentity,
  type PredictRequest,
} from './types';

export interface LiveClientOptions {
  /** Model used when a request omits `model`. */
  defaultModel: ModelId;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  isOnline?: () => boolean;
}

const LIVE_MODELS: readonly ModelId[] = LIVE_MODEL_KEYS;

/** Same-origin client for /api/status and /api/predict. No retries: the shared research API is never hammered. */
export class LiveInferenceClient implements InferenceClient {
  readonly source = 'live' as const;
  private readonly transport: TransportOptions;

  constructor(private readonly options: LiveClientOptions) {
    if (!LIVE_MODELS.includes(options.defaultModel)) {
      throw new RangeError(`Model ${options.defaultModel} is not served live`);
    }
    this.transport = {
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      fetchImpl: options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init)),
      isOnline: options.isOnline ?? browserIsOnline,
    };
  }

  async status(signal?: AbortSignal): Promise<ModelIdentity> {
    const status = await performRequest(
      this.transport,
      `/api/status?model=${this.options.defaultModel}`,
      { method: 'GET' },
      (response) => this.readStatus(response),
      signal,
    );
    return toModelIdentity(status.identity);
  }

  async predict(request: PredictRequest): Promise<InferenceResult> {
    const model = request.model ?? this.options.defaultModel;
    const mode = request.mode ?? 'base';
    if (!LIVE_MODELS.includes(model)) {
      throw new RangeError(`Model ${model} is not served live`);
    }
    const started = performance.now();
    const body = new FormData();
    body.append('file', request.file);
    const path = `/api/predict?model=${model}&mode=${mode}`;
    return performRequest(
      this.transport,
      path,
      { method: 'POST', body },
      async (response) => {
        const payload = await this.readPredict(response, model);
        return toInferenceResult(payload, performance.now() - started);
      },
      request.signal,
    );
  }

  private async readStatus(response: Response): Promise<StatusResponse> {
    await this.assertOk(response);
    const status = parseOrInvalid(statusSchema, await readJson(response), 'status');
    if (status.model_key !== this.options.defaultModel) {
      throw new InferenceError('invalid-response', `Requested ${this.options.defaultModel}, server answered ${status.model_key}`);
    }
    if (!isServingReady(status)) {
      throw new InferenceError('server-error', `Model not ready: ${status.reason}`);
    }
    return status;
  }

  private async readPredict(response: Response, requested: ModelId) {
    await this.assertOk(response);
    const body = parseOrInvalid(predictResponseSchema, await readJson(response), 'predict');
    if (body.model_key !== requested) {
      throw new InferenceError('invalid-response', `Requested ${requested}, server answered ${body.model_key}`);
    }
    return body;
  }

  private async assertOk(response: Response): Promise<void> {
    if (response.ok) return;
    const detail = await readErrorDetail(response);
    throw new InferenceError(scenarioForHttpStatus(response.status), `HTTP ${response.status}${detail}`);
  }
}

/** Only malformed JSON is `invalid-response`; aborts and network errors propagate to the transport. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new InferenceError('invalid-response', 'Response body is not JSON', { cause: error });
    }
    throw error;
  }
}

/** Best-effort error text for diagnostics only; never trusted, never required. */
async function readErrorDetail(response: Response): Promise<string> {
  try {
    const parsed = apiErrorBodySchema.safeParse(await response.json());
    if (parsed.success && 'error' in parsed.data) {
      return ` ${parsed.data.error.code}`;
    }
    return '';
  } catch {
    return '';
  }
}
