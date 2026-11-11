import { describe, expect, it } from 'vitest';
import {
  analyzeResponseSchema,
  simulateToneResponseSchema,
  toAnalysisResult,
} from '@/core/inference/analyzeContract';
import { parseOrInvalid } from '@/core/inference/contract';
import { InferenceError } from '@/core/inference/types';

const CLASSIFICATION = {
  pred: 'nv',
  confidence: 0.6,
  classes: ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc'],
  probs: { akiec: 0.02, bcc: 0.02, bkl: 0.1, df: 0.01, mel: 0.2, nv: 0.6, vasc: 0.05 },
  feature_dim: 768,
  mode: 'base',
  requested_mode: 'base',
  inference_mode: 'single_view',
  views: 1,
  model_key: 'MOCO_HAM7',
  identity: {
    model_id: 'dermssl-v10-moco',
    release: 'v10.0.0',
    model_sha256: 'a'.repeat(64),
    sha256_verified: true,
    recipe: { feature: 'cls4', tau: 0.1, tta: 'none', n_views: 1 },
  },
};

const IDENTITY = {
  model_id: 'dermlip-resnet34-unet-teacher',
  run: 'abl0xx-ima-s01',
  release: 'v10.2.0',
  model_sha256: 'b'.repeat(64),
  input_size: 224,
};

const CONTOUR = [
  [100, 80],
  [300, 80],
  [300, 260],
  [100, 260],
];

function okSegmentation(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ok',
    reason: null,
    image_width: 1024,
    image_height: 768,
    mask_width: 512,
    mask_height: 384,
    mask_png_base64: 'iVBORw0KGgo=',
    contour: CONTOUR,
    area_fraction: 0.183,
    threshold: 0.5,
    identity: IDENTITY,
    ...overrides,
  };
}

function okPhotometry(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ok',
    reason: null,
    region: 'perilesional_ring',
    median_L: 63.2,
    median_b: 14.1,
    ita_deg: 42.5,
    ita_category: 'light',
    category_scheme: 'Chardon 1991 / Del Bino 2006 ITA categories (colorimetric, not Fitzpatrick)',
    n_px: 5321,
    valid_fraction: 0.81,
    ...overrides,
  };
}

function analyzeBody(overrides: Record<string, unknown> = {}) {
  return {
    schema: 'dermssl.analyze.v1',
    scope: 'research',
    classification: CLASSIFICATION,
    segmentation: okSegmentation(),
    photometry: okPhotometry(),
    timing_ms: { classification: 15100, segmentation: 70, photometry: 12 },
    ...overrides,
  };
}

function expectInvalid(payload: unknown) {
  expect(() => parseOrInvalid(analyzeResponseSchema, payload, 'analyze')).toThrow(InferenceError);
}

describe('analyze contract: valid payloads', () => {
  // TODO(captures): the mapping of a complete ok body must use a REAL capture (fixtures/api/analyze-MOCO_HAM7-*.json).
  it.skip('accepts a complete ok response and maps it to the app shape', () => {
    const body = parseOrInvalid(analyzeResponseSchema, analyzeBody(), 'analyze');
    const result = toAnalysisResult(body, 15200);
    const seg = result.segmentation;
    const ph = result.photometry;
    if (seg?.status !== 'ok' || ph?.status !== 'ok') throw new Error('expected ok segmentation and photometry');
    expect(seg.contour).toHaveLength(4);
    expect(ph.itaDeg).toBe(42.5);
    expect(ph.itaCategory).toBe('light');
    expect(result.model).toBe('MOCO_HAM7');
  });

  it('accepts unavailable segmentation without failing the request', () => {
    const body = analyzeBody({
      segmentation: { status: 'unavailable', reason: 'empty_mask' },
      photometry: { status: 'unavailable', reason: 'no_mask' },
    });
    expect(() => parseOrInvalid(analyzeResponseSchema, body, 'analyze')).not.toThrow();
  });

  it('accepts indeterminate ITA with L*/b* still present and ita null', () => {
    const body = analyzeBody({
      photometry: okPhotometry({
        status: 'indeterminate',
        reason: 'ita_indeterminate',
        median_b: 3.2,
        ita_deg: null,
        ita_category: null,
      }),
    });
    expect(() => parseOrInvalid(analyzeResponseSchema, body, 'analyze')).not.toThrow();
  });
});

describe('analyze contract: invalid payloads', () => {
  it('rejects a mask larger than 512 px on its longest side', () => {
    expectInvalid(analyzeBody({ segmentation: okSegmentation({ mask_width: 600, mask_height: 450 }) }));
  });

  it('rejects a mask whose aspect ratio differs from the image', () => {
    expectInvalid(analyzeBody({ segmentation: okSegmentation({ mask_width: 512, mask_height: 512 }) }));
  });

  it('rejects contour points outside the original image bounds', () => {
    expectInvalid(analyzeBody({ segmentation: okSegmentation({ contour: [[0, 0], [1025, 10], [5, 5]] }) }));
  });

  it('rejects an ok segmentation with fewer than three contour points', () => {
    expectInvalid(analyzeBody({ segmentation: okSegmentation({ contour: [[1, 1], [2, 2]] }) }));
  });

  it('rejects a non-finite area_fraction', () => {
    expectInvalid(analyzeBody({ segmentation: okSegmentation({ area_fraction: Number.NaN }) }));
  });

  it('rejects ita_deg when photometry is not ok', () => {
    expectInvalid(
      analyzeBody({
        photometry: okPhotometry({ status: 'indeterminate', reason: 'ita_indeterminate', ita_deg: 12 }),
      }),
    );
  });

  it('rejects ok photometry without ita_deg (ita must be null iff status != ok)', () => {
    expectInvalid(analyzeBody({ photometry: okPhotometry({ ita_deg: null }) }));
  });

  it('rejects a payload with a foreign schema tag', () => {
    expectInvalid(analyzeBody({ schema: 'dermssl.analyze.v2' }));
  });
});

describe('simulate-tone contract', () => {
  const simulateBody = (overrides: Record<string, unknown> = {}) => ({
    schema: 'dermssl.simulate-tone.v1',
    scope: 'research-simulation',
    delta_l: -8,
    image_webp_base64: 'UklGRg==',
    width: 768,
    height: 576,
    lesion_pixels_preserved: true,
    clipped_fraction: 0.002,
    photometry: okPhotometry({ median_L: 55.2, ita_deg: 35.1, ita_category: 'intermediate' }),
    ...overrides,
  });

  it('accepts a delta inside the documented range', () => {
    expect(() => parseOrInvalid(simulateToneResponseSchema, simulateBody(), 'simulate')).not.toThrow();
  });

  it('rejects a delta outside [-16, +16]', () => {
    expect(() =>
      parseOrInvalid(simulateToneResponseSchema, simulateBody({ delta_l: -20 }), 'simulate'),
    ).toThrow(InferenceError);
  });

  it('rejects a response that does not preserve lesion pixels', () => {
    expect(() =>
      parseOrInvalid(simulateToneResponseSchema, simulateBody({ lesion_pixels_preserved: false }), 'simulate'),
    ).toThrow(InferenceError);
  });
});
