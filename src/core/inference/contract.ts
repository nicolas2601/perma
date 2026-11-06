import { z } from 'zod';
import {
  CLASS_CODES,
  InferenceError,
  type InferenceResult,
  type ModelIdentity,
} from './types';

/** Arms the public API serves today. `next` is mock-only and never reaches this contract. */
export const LIVE_MODEL_KEYS = ['A71', 'B71'] as const;
export const INFERENCE_MODES = ['base', 'tta'] as const;

const SHA256_HEX = /^[0-9a-f]{64}$/;

export const classCodeSchema = z.enum(CLASS_CODES);
const scoreSchema = z.number().finite().min(0).max(1);
/** Exhaustive: every class code must be present (zod 4 enum-keyed record). */
export const scoresSchema = z.record(classCodeSchema, scoreSchema);
const modelKeySchema = z.enum(LIVE_MODEL_KEYS);
const modeSchema = z.enum(INFERENCE_MODES);

export const recipeSchema = z.object({
  feature: z.string().min(1),
  tau: z.number().finite(),
  tta: z.string().min(1),
  aggregation: z.string().min(1),
  n_views: z.number().int().positive(),
});

export const identitySchema = z.object({
  model_id: z.string().min(1),
  release: z.string().min(1),
  arm: modelKeySchema,
  model_sha256: z.string().regex(SHA256_HEX).nullable(),
  sha256_verified: z.boolean(),
  recipe: recipeSchema,
});

/** Per-arm state shared by /api/status and the per-model entries of /api/report. */
const modelStateSchema = z.object({
  backbone_ready: z.boolean(),
  classification_ready: z.boolean(),
  reason: z.string().min(1),
  release: z.string().min(1),
  release_arm: modelKeySchema,
  device: z.string().min(1),
  threads: z.number().int().nonnegative(),
  identity: identitySchema,
  recipe: recipeSchema,
});

/** GET /api/status (fixtures/api/status.json). Adds the arm selected by the server. */
export const statusSchema = modelStateSchema.extend({ model_key: modelKeySchema });
export type StatusResponse = z.infer<typeof statusSchema>;

/** GET /api/report (fixtures/api/report.json). No scientific report, only state and disclaimer. */
export const reportSchema = z.object({
  source: z.object({ release: z.string().min(1), scope: z.string().min(1) }),
  disclaimer: z.string().min(1),
  model: modelStateSchema,
  models: z.object({ A71: modelStateSchema, B71: modelStateSchema }),
});

/** POST /api/predict success body (fixtures/api/predict-B71-{base,tta}.json). */
export const predictResponseSchema = z
  .object({
    pred: classCodeSchema,
    confidence: scoreSchema,
    classes: z.array(classCodeSchema),
    probs: scoresSchema,
    feature_dim: z.number().int().positive(),
    mode: modeSchema,
    requested_mode: modeSchema,
    inference_mode: z.string().min(1),
    views: z.number().int().positive(),
    model_key: modelKeySchema,
    identity: identitySchema,
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

export function formatRecipe(recipe: StatusResponse['recipe']): string {
  return `${recipe.feature} | tau=${recipe.tau} | ${recipe.tta} | ${recipe.aggregation} | n=${recipe.n_views}`;
}

export function toModelIdentity(identity: z.infer<typeof identitySchema>): ModelIdentity {
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
  if (body.requested_mode !== body.mode) warnings.push('mode-mismatch');
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
