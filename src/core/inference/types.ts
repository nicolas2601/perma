export type ModelId = 'A71' | 'B71' | 'next';
export type InferenceMode = 'base' | 'tta';
export type DataSource = 'live' | 'mock';

export const CLASS_CODES = ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc'] as const;
export type ClassCode = (typeof CLASS_CODES)[number];

export interface ModelIdentity {
  modelId: string;
  sha256: string | null;
  sha256Verified: boolean | null;
  recipe: string | null;
  release: string | null;
}

export interface InferenceResult {
  source: DataSource;
  model: ModelId;
  mode: InferenceMode;
  identity: ModelIdentity;
  /** Raw experimental scores per class. Not probabilities, not a diagnosis. */
  scores: Record<ClassCode, number>;
  latencyMs: number;
  warnings: string[];
}

export type RecoveryScenario =
  | 'permission' | 'offline' | 'server-error' | 'timeout'
  | 'invalid-response' | 'rate-limit' | 'file-unavailable' | 'export-unavailable';

export interface PredictRequest {
  file: Blob;
  model?: ModelId;
  mode?: InferenceMode;
  signal?: AbortSignal;
}

export interface InferenceClient {
  readonly source: DataSource;
  status(signal?: AbortSignal): Promise<ModelIdentity>;
  predict(request: PredictRequest): Promise<InferenceResult>;
}

export class InferenceError extends Error {
  constructor(readonly scenario: RecoveryScenario, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'InferenceError';
  }
}
