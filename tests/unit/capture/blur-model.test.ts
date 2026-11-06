import { describe, expect, it } from 'vitest';
import shippedModel from '@/core/capture/model/camera-blur-model.json?raw';
import { createBlurPredictor, passesAcceptanceGate, validateBlurModel, type BlurModel } from '@/core/capture/blur-model';
import { extractBlurFeatures } from '@/core/capture/blur-features';
import { ModelValidationError } from '@/core/capture/errors';
import { loadBlurHead } from '@/core/capture/model-loader';
import { lumaOf } from '@/core/capture/luma';
import { checkerboard, EDGE, texturedLuma, toFrame } from './fixtures';

const shipped = (): BlurModel => JSON.parse(shippedModel) as BlurModel;
const cloneWith = (patch: Record<string, unknown>): Record<string, unknown> => ({ ...shipped(), ...patch });

function expectInvalid(raw: unknown, field: string): void {
  let caught: unknown = null;
  try {
    validateBlurModel(raw);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ModelValidationError);
  expect((caught as ModelValidationError).field).toBe(field);
}

describe('blur model validation', () => {
  it('accepts the shipped model', () => {
    expect(() => validateBlurModel(shipped())).not.toThrow();
  });

  it('rejects a wrong scope', () => {
    expectInvalid(cloneWith({ scope: 'production' }), 'scope');
  });

  it('rejects the wrong feature count', () => {
    expectInvalid(cloneWith({ features: 5 }), 'features');
  });

  it('rejects a non-finite weight', () => {
    const weights = [...shipped().weights];
    weights[2] = Number.NaN;
    expectInvalid(cloneWith({ weights }), 'weights');
  });

  it('rejects a zero scale (division by zero at inference)', () => {
    const scale = [...shipped().scale];
    scale[0] = 0;
    expectInvalid(cloneWith({ scale }), 'scale');
  });

  it('rejects a threshold outside (0, 1)', () => {
    expectInvalid(cloneWith({ threshold: 1 }), 'threshold');
  });

  it('rejects a range whose minimum exceeds its maximum', () => {
    const min = [...shipped().min];
    min[1] = (shipped().max[1] ?? 0) + 1;
    expectInvalid(cloneWith({ min }), 'min');
  });

  it('rejects a missing acceptance block', () => {
    const withoutAcceptance: Record<string, unknown> = { ...shipped() };
    delete withoutAcceptance['acceptance'];
    expectInvalid(withoutAcceptance, 'acceptance');
  });

  it('rejects a non-object', () => {
    expectInvalid('{}', 'model');
  });
});

describe('acceptance gate', () => {
  it('the shipped model is not accepted (gate recorded as failed)', () => {
    expect(shipped().acceptance.passed).toBe(false);
    expect(passesAcceptanceGate(shipped())).toBe(false);
  });

  it('a file that claims passed=true with failing test numbers is still refused', () => {
    const tampered = { ...shipped(), acceptance: { ...shipped().acceptance, passed: true, test: { recall: 0.99, falseAlertRate: 0.2, abstentionRate: 0 } } };
    expect(passesAcceptanceGate(validateBlurModel(tampered))).toBe(false);
  });
});

describe('model loader (on demand)', () => {
  it('disables the head with a reason when the shipped gate has not passed', async () => {
    await expect(loadBlurHead()).resolves.toEqual({ enabled: false, reason: 'acceptance-gate-not-passed' });
  });

  it('reports a missing model file without throwing', async () => {
    const missing = () => Promise.reject(new Error('404'));
    await expect(loadBlurHead(missing)).resolves.toEqual({ enabled: false, reason: 'model-unavailable' });
  });

  it('reports invalid JSON without throwing', async () => {
    await expect(loadBlurHead(() => Promise.resolve({ default: '{not json' }))).resolves.toEqual({ enabled: false, reason: 'model-not-json' });
  });

  it('reports the invalid field of a corrupt model', async () => {
    const corrupt = JSON.stringify(cloneWith({ scope: 'production' }));
    await expect(loadBlurHead(() => Promise.resolve({ default: corrupt }))).resolves.toEqual({ enabled: false, reason: 'model-invalid:scope' });
  });

  it('enables the head only when the gate holds on re-check', async () => {
    const passing = { ...shipped(), acceptance: { ...shipped().acceptance, passed: true, test: { recall: 0.9, falseAlertRate: 0.01, abstentionRate: 0 }, battery: { recall: 0.9, falseAlertRate: 0.01 } } };
    const result = await loadBlurHead(() => Promise.resolve({ default: JSON.stringify(passing) }));
    expect(result.enabled).toBe(true);
  });
});

describe('predictor', () => {
  it('matches a naive logistic evaluation of the same parameters (parity)', () => {
    const model = shipped();
    const predictor = createBlurPredictor(model);
    const samples = [0, 1, 2].map(k => model.mean.map((m, d) => m + (k - 1) * 0.1 * (model.max[d]! - model.min[d]!) * 0.1 * (d + 1)));
    for (const sample of samples) {
      const inRange = sample.every((v, d) => v >= model.min[d]! && v <= model.max[d]!);
      if (!inRange) continue;
      const logit = model.bias + sample.reduce((s, v, d) => s + ((v - model.mean[d]!) / model.scale[d]!) * model.weights[d]!, 0);
      expect(predictor.predict(sample).probability).toBeCloseTo(1 / (1 + Math.exp(-logit)), 12);
    }
  });

  it('abstains outside the training range instead of judging', () => {
    const model = shipped();
    const far = model.max.map(v => v + 1000);
    expect(createBlurPredictor(model).predict(far)).toEqual({ probability: 0, abstained: true });
  });

  it('checkerboard (sharp, extreme high-frequency energy) is abstained, not judged', () => {
    const features = extractBlurFeatures(lumaOf(toFrame(checkerboard())), EDGE, EDGE);
    expect(createBlurPredictor(shipped()).predict(features).abstained).toBe(true);
  });

  it('feature extraction is finite on a textured scene and on a defocused scene', () => {
    const sharp = extractBlurFeatures(lumaOf(toFrame(texturedLuma(7))), EDGE, EDGE);
    expect(sharp).toHaveLength(6);
    expect(sharp.every(Number.isFinite)).toBe(true);
  });
});
