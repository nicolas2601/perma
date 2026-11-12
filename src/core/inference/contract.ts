import { z } from 'zod';
import { CLASS_CODES, InferenceError, type InferenceResult, type ModelIdentity } from './types';

/** The only model served live. A71/B71 were retired by the backend on 2026-11-08 (predict answers 422). */
export const LIVE_MODEL_KEYS = ['MOCO_HAM7'] as const;

const SHA256_HEX = /^[0-9a-f]{64}$/;

export const classCodeSchema = z.enum(CLASS_CODES);
const scoreSchema = z.number().finite().min(0).max(1);
/** Exhaustive: every class code must be present (zod 4 enum-keyed record). */
export const scoresSchema = z.record(classCodeSchema, scoreSchema);
const modelKeySchema = z.enum(LIVE_MODEL_KEYS);
const baseModeSchema = z.literal('base');

/** v10.0.0 names the feature `feature` and uses one view; v10.1.0 names it `features` and averages 8 D4 views. */
export const mocoRecipeSchema = z
  .object({
    feature: z.string().min(1).optional(),
    features: z.string().min(1).optional(),
    tau: z.number().finite(),
    tta: z.enum(['none', 'd4-mean']),
    n_views: z.union([z.literal(1), z.literal(8)]).optional(),
    views: z.union([z.literal(1), z.literal(8)]).optional(),
  })
  .refine((recipe) => recipe.feature !== undefined || recipe.features !== undefined, {
    message: 'recipe must name its feature',
  })
  .refine((recipe) => recipe.n_views !== undefined || recipe.views !== undefined, {
    message: 'recipe must state its view count',
  });

export const mocoIdentitySchema = z.object({
  model_id: z.literal('dermssl-v10-moco'),
  release: z.string().min(1),
  model_sha256: z.string().regex(SHA256_HEX),
  sha256_verified: z.boolean().nullable().default(null),
  recipe: mocoRecipeSchema,
});

/** GET /api/status (fixtures/api/status-MOCO_HAM7.json). */
export const statusSchema = z.object({
  backbone_ready: z.boolean(),
  classification_ready: z.boolean(),
  reason: z.string().min(1),
  release: z.string().min(1),
  release_arm: z.null(),
  device: z.string().min(1),
  threads: z.number().int().nonnegative(),
  model_key: modelKeySchema,
  identity: mocoIdentitySchema,
});
export type StatusResponse = z.infer<typeof statusSchema>;

/** POST /api/predict success body (fixtures/api/predict-MOCO_HAM7-base.json). */
export const predictResponseSchema = z
  .object({
    pred: classCodeSchema,
    confidence: scoreSchema,
    classes: z.array(classCodeSchema),
    probs: scoresSchema,
    feature_dim: z.number().int().positive(),
    mode: baseModeSchema,
    requested_mode: baseModeSchema,
    inference_mode: z.enum(['single_view', 'd4_tta_8view']),
    views: z.union([z.literal(1), z.literal(8)]),
    model_key: modelKeySchema,
    identity: mocoIdentitySchema,
  })
  .refine((body) => (body.inference_mode === 'single_view') === (body.views === 1), {
    message: 'inference_mode and views must agree',
  })
  .refine((body) => sameClassOrder(body.classes), {
    message: 'classes must match CLASS_CODES order',
  })
  .refine((body) => Math.abs(body.confidence - body.probs[body.pred]) < 1e-6, {
    message: 'confidence must equal probs[pred]',
  });
export type PredictResponse = z.infer<typeof predictResponseSchema>;

/** Error bodies seen in fixtures/api/probe-*.json. Both shapes are tolerated; the message is optional. */
export const apiErrorBodySchema = z.union([
  z.object({ error: z.object({ code: z.string(), message: z.string().optional() }) }),
  z.object({ detail: z.array(z.unknown()) }),
]);

function sameClassOrder(classes: readonly string[]): boolean {
  return classes.length === CLASS_CODES.length && classes.every((code, i) => code === CLASS_CODES[i]);
}

/** Parses an untrusted payload. Any mismatch becomes InferenceError('invalid-response'); never partial. */
export function parseOrInvalid<S extends z.ZodType>(schema: S, payload: unknown, context: string): z.output<S> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new InferenceError('invalid-response', `Invalid ${context} payload`, { cause: parsed.error });
  }
  return parsed.data;
}

export function formatRecipe(recipe: z.infer<typeof mocoRecipeSchema>): string {
  const feature = recipe.feature ?? recipe.features ?? '';
  return `${feature} | tau=${recipe.tau} | ${recipe.tta} | n=${recipe.n_views ?? recipe.views}`;
}

export function toModelIdentity(identity: z.infer<typeof mocoIdentitySchema>): ModelIdentity {
  return {
    modelId: identity.model_id,
    sha256: identity.model_sha256,
    sha256Verified: identity.sha256_verified,
    recipe: formatRecipe(identity.recipe),
    release: identity.release,
  };
}

function collectWarnings(body: PredictResponse): string[] {
  const warnings: string[] = [];
  if (!body.identity.sha256_verified) warnings.push('identity-unverified');
  return warnings;
}

/** Normalizes a validated predict body into the app-wide InferenceResult (source: 'live'). */
export function toInferenceResult(body: PredictResponse, latencyMs: number): InferenceResult {
  return {
    source: 'live',
    model: body.model_key,
    mode: body.mode,
    identity: toModelIdentity(body.identity),
    scores: body.probs,
    latencyMs,
    warnings: collectWarnings(body),
  };
}

/** Status is ready only when both backbone and classifier are loaded. */
export function isServingReady(status: StatusResponse): boolean {
  return status.backbone_ready && status.classification_ready;
}
