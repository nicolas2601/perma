import { describe, expect, it } from 'vitest';
import {
  apiErrorBodySchema,
  parseOrInvalid,
  predictResponseSchema,
  statusSchema,
  toInferenceResult,
} from '@/core/inference/contract';
import { CLASS_CODES, InferenceError } from '@/core/inference/types';
import { fixtureJson } from '@/mocks/msw/fixtures';

const base = () => structuredClone(fixtureJson('mocoPredict')) as Record<string, unknown>;

function expectInvalid(payload: unknown) {
  expect(() => parseOrInvalid(predictResponseSchema, payload, 'predict')).toThrow(InferenceError);
  try {
    parseOrInvalid(predictResponseSchema, payload, 'predict');
  } catch (error) {
    expect((error as InferenceError).scenario).toBe('invalid-response');
  }
}

describe('contract: captured MOCO_HAM7 fixtures validate', () => {
  it('validates the status and predict captures', () => {
    expect(() => parseOrInvalid(statusSchema, fixtureJson('mocoStatus'), 'status')).not.toThrow();
    expect(() => parseOrInvalid(predictResponseSchema, fixtureJson('mocoPredict'), 'predict')).not.toThrow();
  });

  it('maps the predict capture to a live InferenceResult with the served model', () => {
    const body = parseOrInvalid(predictResponseSchema, fixtureJson('mocoPredict'), 'predict');
    const result = toInferenceResult(body, 12);
    expect(result).toMatchObject({ source: 'live', model: 'MOCO_HAM7', mode: 'base', latencyMs: 12 });
    expect(Object.keys(result.scores).sort()).toEqual([...CLASS_CODES].sort());
  });
});

describe('contract: invalid predict payloads are rejected', () => {
  it('rejects a class order that differs from CLASS_CODES', () => {
    const body = base();
    body.classes = [...(body.classes as string[])].reverse();
    expectInvalid(body);
  });

  it('rejects a confidence that does not equal probs[pred]', () => {
    const body = base();
    body.confidence = 0.123456;
    expectInvalid(body);
  });

  it('rejects any model other than MOCO_HAM7 (A71/B71 are retired)', () => {
    expectInvalid({ ...base(), model_key: 'B71' });
    expectInvalid({ ...base(), model_key: 'A71' });
  });

  it('rejects the retired tta mode: the UI exposes a single base mode', () => {
    expectInvalid({ ...base(), requested_mode: 'tta', mode: 'tta' });
  });

  it('rejects a non-finite or out-of-range score', () => {
    const body = base();
    (body.probs as Record<string, number>).mel = Number.NaN;
    expectInvalid(body);
  });
});

describe('contract: error bodies', () => {
  it('accepts both tolerated error shapes', () => {
    expect(apiErrorBodySchema.safeParse({ error: { code: 'INVALID_IMAGE' } }).success).toBe(true);
    expect(apiErrorBodySchema.safeParse({ detail: [] }).success).toBe(true);
  });
});
