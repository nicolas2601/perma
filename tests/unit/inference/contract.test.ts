import { describe, expect, it } from 'vitest';
import {
  apiErrorBodySchema,
  parseOrInvalid,
  predictResponseSchema,
  reportSchema,
  statusSchema,
  toInferenceResult,
} from '@/core/inference/contract';
import { CLASS_CODES, InferenceError } from '@/core/inference/types';
import { fixtureJson } from '@/mocks/msw/fixtures';

const base = () => structuredClone(fixtureJson('predictBase')) as Record<string, unknown>;

function expectInvalid(payload: unknown) {
  expect(() => parseOrInvalid(predictResponseSchema, payload, 'predict')).toThrow(InferenceError);
  try {
    parseOrInvalid(predictResponseSchema, payload, 'predict');
  } catch (error) {
    expect((error as InferenceError).scenario).toBe('invalid-response');
  }
}

describe('contract: captured fixtures validate', () => {
  it('validates status, report and both predict modes', () => {
    expect(statusSchema.safeParse(fixtureJson('status')).success).toBe(true);
    expect(reportSchema.safeParse(fixtureJson('report')).success).toBe(true);
    expect(predictResponseSchema.safeParse(fixtureJson('predictBase')).success).toBe(true);
    expect(predictResponseSchema.safeParse(fixtureJson('predictTta')).success).toBe(true);
  });

  it('accepts both captured error shapes', () => {
    expect(apiErrorBodySchema.safeParse(fixtureJson('probeEmptyFile')).success).toBe(true);
    expect(apiErrorBodySchema.safeParse(fixtureJson('probeNoFile')).success).toBe(true);
  });

  it('normalizes the base fixture to an InferenceResult with the captured identity', () => {
    const body = parseOrInvalid(predictResponseSchema, fixtureJson('predictBase'), 'predict');
    const result = toInferenceResult(body, 123);
    expect(result).toEqual({
      source: 'live',
      model: 'B71',
      mode: 'base',
      identity: {
        modelId: 'dermssl-v9-B71',
        sha256: '7fd581afc14a5c61da37f8d3873ce78c228276b0186a98e39096e9130285bbd6',
        sha256Verified: true,
        recipe: 'cls4 | tau=0 | D4 | mean_probabilities | n=8',
        release: 'v9.0.0',
      },
      scores: body.probs,
      latencyMs: 123,
      warnings: [],
    });
    expect(Object.keys(result.scores).sort()).toEqual([...CLASS_CODES].sort());
  });

  it('flags a mode mismatch as a warning instead of failing silently', () => {
    const body = parseOrInvalid(
      predictResponseSchema,
      { ...base(), requested_mode: 'tta', mode: 'base' },
      'predict',
    );
    expect(toInferenceResult(body, 0).warnings).toEqual(['mode-mismatch']);
  });

  it('tolerates unknown extra fields from the server', () => {
    expect(predictResponseSchema.safeParse({ ...base(), new_field: 'x' }).success).toBe(true);
  });
});

describe('contract: invalid payloads become invalid-response', () => {
  it('rejects a missing class score', () => {
    const probs = { ...(base().probs as Record<string, number>) };
    delete probs.mel;
    expectInvalid({ ...base(), probs });
  });

  it('rejects a score outside [0, 1]', () => {
    const probs = { ...(base().probs as Record<string, number>), nv: 1.5 };
    expectInvalid({ ...base(), probs, confidence: 1.5 });
  });

  it('rejects classes out of CLASS_CODES order', () => {
    expectInvalid({ ...base(), classes: [...CLASS_CODES].reverse() });
  });

  it('rejects a confidence that does not match probs[pred]', () => {
    expectInvalid({ ...base(), confidence: 0.1 });
  });

  it('rejects a non-hex sha256', () => {
    const identity = { ...(base().identity as Record<string, unknown>), model_sha256: 'not-a-hash' };
    expectInvalid({ ...base(), identity });
  });

  it('rejects an unknown model_key', () => {
    expectInvalid({ ...base(), model_key: 'next' });
  });

  it('rejects a non-object payload', () => {
    expectInvalid('<html>');
    expectInvalid(null);
  });
});
