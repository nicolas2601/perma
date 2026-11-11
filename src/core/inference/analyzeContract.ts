import { z } from 'zod';
import { predictResponseSchema, toInferenceResult, type PredictResponse } from './contract';
import {
  ITA_CATEGORIES,
  type InferenceResult,
  type PhotometryResult,
  type SegmentationResult,
  type ToneSimulation,
} from './types';

export const ANALYZE_SCHEMA = 'dermssl.analyze.v1';
export const SIMULATE_TONE_SCHEMA = 'dermssl.simulate-tone.v1';
export const MAX_MASK_SIDE = 512;
export const MAX_CONTOUR_POINTS = 256;
export const MIN_CONTOUR_POINTS = 3;
export const ASPECT_TOLERANCE = 0.02;
export const DELTA_L_LIMIT = 16;

const SHA256_HEX = /^[0-9a-f]{64}$/;
const finite = z.number().finite();
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const unitInterval = z.number().finite().min(0).max(1);

const segmentationIdentitySchema = z.object({
  model_id: z.string().min(1),
  run: z.string().min(1),
  release: z.string().min(1),
  model_sha256: z.string().regex(SHA256_HEX),
  input_size: positiveInt,
});

const contourPointSchema = z.tuple([finite, finite]);

function sameAspect(maskW: number, maskH: number, imageW: number, imageH: number): boolean {
  const maskRatio = maskW / maskH;
  const imageRatio = imageW / imageH;
  return Math.abs(maskRatio - imageRatio) / imageRatio <= ASPECT_TOLERANCE;
}

const okSegmentationSchema = z
  .object({
    status: z.literal('ok'),
    reason: z.null(),
    image_width: positiveInt,
    image_height: positiveInt,
    mask_width: positiveInt,
    mask_height: positiveInt,
    mask_png_base64: z.string().min(1),
    contour: z.array(contourPointSchema).min(MIN_CONTOUR_POINTS).max(MAX_CONTOUR_POINTS),
    area_fraction: unitInterval,
    threshold: finite,
    identity: segmentationIdentitySchema,
  })
  .superRefine((seg, ctx) => {
    if (Math.max(seg.mask_width, seg.mask_height) > MAX_MASK_SIDE) {
      ctx.addIssue({ code: 'custom', path: ['mask_width'], message: 'mask longest side exceeds 512' });
    }
    if (!sameAspect(seg.mask_width, seg.mask_height, seg.image_width, seg.image_height)) {
      ctx.addIssue({ code: 'custom', path: ['mask_height'], message: 'mask aspect differs from image' });
    }
    const outside = seg.contour.some(
      ([x, y]) => x < 0 || y < 0 || x > seg.image_width || y > seg.image_height,
    );
    if (outside) {
      ctx.addIssue({ code: 'custom', path: ['contour'], message: 'contour point outside image bounds' });
    }
  });

const unavailableSegmentationSchema = z.object({
  status: z.literal('unavailable'),
  reason: z.enum(['empty_mask', 'degenerate_mask', 'segmenter_error']),
});

export const segmentationSchema = z.discriminatedUnion('status', [
  okSegmentationSchema,
  unavailableSegmentationSchema,
]);

const photometryCommon = {
  region: z.string().min(1),
  median_L: finite,
  median_b: finite,
  category_scheme: z.string().min(1),
  n_px: nonNegativeInt,
  valid_fraction: unitInterval,
};

/** ITA is present only when status is ok: enforced by the union, not by runtime checks. */
export const photometrySchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    reason: z.null(),
    ...photometryCommon,
    ita_deg: finite,
    ita_category: z.enum(ITA_CATEGORIES),
  }),
  z.object({
    status: z.literal('indeterminate'),
    reason: z.literal('ita_indeterminate'),
    ...photometryCommon,
    ita_deg: z.null(),
    ita_category: z.null(),
  }),
  z.object({
    status: z.literal('unavailable'),
    reason: z.enum(['no_mask', 'degenerate_mask', 'ring_too_small']),
  }),
]);

/** POST /api/analyze success body. The classification reuses the predict schema unchanged. */
export const analyzeResponseSchema = z.object({
  schema: z.literal(ANALYZE_SCHEMA),
  scope: z.literal('research'),
  classification: predictResponseSchema,
  segmentation: segmentationSchema,
  photometry: photometrySchema,
  timing_ms: z.object({
    classification: nonNegativeInt,
    segmentation: nonNegativeInt,
    photometry: nonNegativeInt,
  }),
});
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;

/** POST /api/simulate-tone success body. Delta is validated, never silently clamped. */
export const simulateToneResponseSchema = z.object({
  schema: z.literal(SIMULATE_TONE_SCHEMA),
  scope: z.literal('research-simulation'),
  delta_l: z.number().finite().min(-DELTA_L_LIMIT).max(DELTA_L_LIMIT),
  image_webp_base64: z.string().min(1),
  width: positiveInt,
  height: positiveInt,
  lesion_pixels_preserved: z.literal(true),
  clipped_fraction: unitInterval,
  photometry: photometrySchema,
});
export type SimulateToneResponse = z.infer<typeof simulateToneResponseSchema>;

type WireSegmentation = z.infer<typeof segmentationSchema>;

function toSegmentation(seg: WireSegmentation): SegmentationResult {
  if (seg.status === 'unavailable') {
    return { status: 'unavailable', source: 'model', reason: seg.reason };
  }
  return {
    status: 'ok',
    source: 'model',
    imageWidth: seg.image_width,
    imageHeight: seg.image_height,
    maskWidth: seg.mask_width,
    maskHeight: seg.mask_height,
    maskPngBase64: seg.mask_png_base64,
    contour: seg.contour.map(([x, y]) => [x, y] as const),
    areaFraction: seg.area_fraction,
    threshold: seg.threshold,
    identity: {
      modelId: seg.identity.model_id,
      run: seg.identity.run,
      release: seg.identity.release,
      modelSha256: seg.identity.model_sha256,
      inputSize: seg.identity.input_size,
    },
  };
}

export function toPhotometry(ph: z.infer<typeof photometrySchema>): PhotometryResult {
  if (ph.status === 'unavailable') {
    return { status: 'unavailable', reason: ph.reason };
  }
  return {
    status: ph.status,
    region: ph.region,
    medianL: ph.median_L,
    medianB: ph.median_b,
    itaDeg: ph.ita_deg,
    itaCategory: ph.ita_category,
    nPx: ph.n_px,
    validFraction: ph.valid_fraction,
  };
}

/** Normalizes a validated analyze body into the app-wide InferenceResult (source: 'live'). */
export function toAnalysisResult(body: AnalyzeResponse, latencyMs: number): InferenceResult {
  const classification: PredictResponse = body.classification;
  return {
    ...toInferenceResult(classification, latencyMs),
    segmentation: toSegmentation(body.segmentation),
    photometry: toPhotometry(body.photometry),
  };
}

/** Maps a validated simulate-tone body to the app shape. Pixels are never inspected here. */
export function toToneSimulation(body: SimulateToneResponse): ToneSimulation {
  return {
    source: 'live',
    deltaL: body.delta_l,
    imageWebpBase64: body.image_webp_base64,
    width: body.width,
    height: body.height,
    clippedFraction: body.clipped_fraction,
    photometry: toPhotometry(body.photometry),
  };
}
