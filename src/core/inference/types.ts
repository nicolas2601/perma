export type ModelId = 'MOCO_HAM7' | 'A71' | 'B71' | 'next';
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
  /** Present only on analyze responses. Optional so predict-only results stay valid. */
  segmentation?: SegmentationResult;
  photometry?: PhotometryResult;
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

export const ITA_CATEGORIES = ['very_light', 'light', 'intermediate', 'tan', 'brown', 'dark'] as const;
export type ItaCategory = (typeof ITA_CATEGORIES)[number];

/** Contour vertex in ORIGINAL image pixel coordinates [x, y]. */
export type ContourPoint = readonly [number, number];

export type SegmentationUnavailableReason = 'empty_mask' | 'degenerate_mask' | 'segmenter_error';
export type PhotometryReason = 'no_mask' | 'degenerate_mask' | 'ring_too_small' | 'ita_indeterminate';

export interface SegmentationIdentity {
  modelId: string;
  run: string;
  release: string;
  modelSha256: string;
  supervision: string;
  inputSize: number;
}

/** Model-derived lesion mask/contour. Source is always the live model (never simulated). */
export type SegmentationResult =
  | {
      status: 'ok';
      source: 'model';
      imageWidth: number;
      imageHeight: number;
      maskWidth: number;
      maskHeight: number;
      /** In-memory only: never persisted or exported. */
      maskPngBase64: string;
      contour: ContourPoint[];
      areaFraction: number;
      threshold: number;
      identity: SegmentationIdentity;
    }
  | { status: 'unavailable'; source: 'model'; reason: SegmentationUnavailableReason };

/** Colorimetric skin measurement from the perilesional ring. Not a Fitzpatrick phototype. */
export type PhotometryResult =
  | {
      status: 'ok' | 'indeterminate';
      region: string;
      medianL: number;
      medianB: number;
      itaDeg: number | null;
      itaCategory: ItaCategory | null;
      nPx: number;
      validFraction: number;
    }
  | { status: 'unavailable'; reason: PhotometryReason };
