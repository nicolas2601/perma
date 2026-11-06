import { BLUR_FEATURE_COUNT } from './blur-features';
import { BLUR_MAX_FALSE_ALERT } from './constants';
import { ModelValidationError } from './errors';

export const BLUR_MODEL_VERSION = 2;
export const BLUR_MODEL_SCOPE = 'synthetic-blur-only';

export interface BlurGateMetrics {
  readonly recall: number;
  readonly falseAlertRate: number;
  readonly abstentionRate: number;
}

export interface BlurModel {
  readonly version: number;
  readonly scope: string;
  readonly features: number;
  readonly mean: readonly number[];
  readonly scale: readonly number[];
  readonly min: readonly number[];
  readonly max: readonly number[];
  readonly weights: readonly number[];
  readonly bias: number;
  readonly threshold: number;
  readonly acceptance: {
    readonly passed: boolean;
    readonly minRecall: number;
    readonly maxFalseAlertRate: number;
    readonly maxAbstentionRate: number;
    /** Held-out split of the procedural training generator (scene-disjoint). */
    readonly test: BlurGateMetrics;
    /** Independent holdout: the R2 synthetic battery, never used for tuning. */
    readonly battery: { readonly recall: number; readonly falseAlertRate: number };
  };
}

export interface BlurPrediction {
  readonly probability: number;
  /** True when the features fall outside the training range: no judgement is made. */
  readonly abstained: boolean;
}

export interface BlurPredictor {
  readonly threshold: number;
  predict(features: readonly number[]): BlurPrediction;
}

const isFiniteVector = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) && value.length === length && value.every(item => typeof item === 'number' && Number.isFinite(item));

const isRate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

function requireField(model: Record<string, unknown>, field: string, valid: (value: unknown) => boolean, message: string): void {
  if (!valid(model[field])) throw new ModelValidationError(field, message);
}

function validateAcceptance(acceptance: unknown): void {
  if (typeof acceptance !== 'object' || acceptance === null) throw new ModelValidationError('acceptance', 'missing');
  const gate = acceptance as Record<string, unknown>;
  requireField(gate, 'passed', value => typeof value === 'boolean', 'must be boolean');
  requireField(gate, 'minRecall', isRate, 'must be a rate');
  requireField(gate, 'maxFalseAlertRate', isRate, 'must be a rate');
  requireField(gate, 'maxAbstentionRate', isRate, 'must be a rate');
  requireRates(gate['test'], 'acceptance.test', ['recall', 'falseAlertRate', 'abstentionRate']);
  requireRates(gate['battery'], 'acceptance.battery', ['recall', 'falseAlertRate']);
}

function requireRates(section: unknown, name: string, fields: readonly string[]): void {
  if (typeof section !== 'object' || section === null) throw new ModelValidationError(name, 'missing');
  const record = section as Record<string, unknown>;
  for (const field of fields) requireField(record, field, isRate, 'must be a rate');
}

/**
 * Validates an untrusted model object: schema, dimensions, finiteness, scope and ranges.
 * Throws ModelValidationError naming the first invalid field.
 */
export function validateBlurModel(raw: unknown): BlurModel {
  if (typeof raw !== 'object' || raw === null) throw new ModelValidationError('model', 'must be an object');
  const model = raw as Record<string, unknown>;
  requireField(model, 'version', value => value === BLUR_MODEL_VERSION, `must be ${BLUR_MODEL_VERSION}`);
  requireField(model, 'scope', value => value === BLUR_MODEL_SCOPE, `must be ${BLUR_MODEL_SCOPE}`);
  requireField(model, 'features', value => value === BLUR_FEATURE_COUNT, `must be ${BLUR_FEATURE_COUNT}`);
  for (const field of ['mean', 'scale', 'min', 'max', 'weights'] as const) {
    requireField(model, field, value => isFiniteVector(value, BLUR_FEATURE_COUNT), `must be ${BLUR_FEATURE_COUNT} finite numbers`);
  }
  requireField(model, 'bias', value => typeof value === 'number' && Number.isFinite(value), 'must be finite');
  requireField(model, 'threshold', value => typeof value === 'number' && value > 0 && value < 1, 'must be in (0, 1)');
  const { scale, min, max } = model as unknown as BlurModel;
  if (scale.some(value => value <= 0)) throw new ModelValidationError('scale', 'must be positive');
  if (min.some((value, i) => value > (max[i] ?? Number.NaN))) throw new ModelValidationError('min', 'must not exceed max');
  validateAcceptance(model['acceptance']);
  return model as unknown as BlurModel;
}

/**
 * Re-checks the acceptance gate from the recorded test metrics. The loader enables the head only when
 * this holds, so a JSON with `passed: true` but failing numbers is still refused.
 */
export function passesAcceptanceGate(model: BlurModel): boolean {
  const gate = model.acceptance;
  const { test, battery } = gate;
  return gate.passed
    && gate.maxFalseAlertRate <= BLUR_MAX_FALSE_ALERT
    && test.recall >= gate.minRecall
    && test.falseAlertRate <= gate.maxFalseAlertRate
    && test.abstentionRate <= gate.maxAbstentionRate
    && battery.recall >= gate.minRecall
    && battery.falseAlertRate <= gate.maxFalseAlertRate;
}

/** Logistic regression over z-scored features, with training-range abstention. */
export function createBlurPredictor(model: BlurModel): BlurPredictor {
  return {
    threshold: model.threshold,
    predict(features) {
      const outside = features.some((value, i) => value < (model.min[i] ?? Number.NaN) || value > (model.max[i] ?? Number.NaN));
      if (outside) return { probability: 0, abstained: true };
      let logit = model.bias;
      features.forEach((value, i) => {
        logit += ((value - (model.mean[i] ?? 0)) / (model.scale[i] ?? 1)) * (model.weights[i] ?? 0);
      });
      return { probability: 1 / (1 + Math.exp(-logit)), abstained: false };
    },
  };
}
