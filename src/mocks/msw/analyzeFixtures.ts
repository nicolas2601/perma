// Test-only. SYNTHETIC bodies that follow /tmp/derm-analyze-contract.md. They are not captured from the live API.
// Every value here is invented for tests and must never be presented as a measurement.
import type { ContourPoint } from '@/core/inference/types';

export const SYNTHETIC_CONTOUR: readonly ContourPoint[] = [
  [100, 80],
  [300, 80],
  [300, 260],
  [100, 260],
];

const SYNTHETIC_IDENTITY = {
  model_id: 'dermlip-resnet34-unet-teacher',
  run: 'synthetic-run',
  release: 'synthetic',
  model_sha256: 'b'.repeat(64),
  supervision: 'synthetic test fixture (not captured)',
  input_size: 224,
};

export const SYNTHETIC_CLASSIFICATION = {
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

export function syntheticAnalyzeBody(overrides: Record<string, unknown> = {}) {
  return {
    schema: 'dermssl.analyze.v1',
    scope: 'research',
    classification: SYNTHETIC_CLASSIFICATION,
    segmentation: {
      status: 'ok',
      reason: null,
      image_width: 1024,
      image_height: 768,
      mask_width: 512,
      mask_height: 384,
      mask_png_base64: 'iVBORw0KGgo=',
      contour: SYNTHETIC_CONTOUR,
      area_fraction: 0.183,
      threshold: 0.5,
      identity: SYNTHETIC_IDENTITY,
    },
    photometry: {
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
    },
    timing_ms: { classification: 15100, segmentation: 70, photometry: 12 },
    ...overrides,
  };
}

export function syntheticSimulateBody(deltaL: number) {
  return {
    schema: 'dermssl.simulate-tone.v1',
    scope: 'research-simulation',
    delta_l: deltaL,
    image_webp_base64: 'UklGRg==',
    width: 768,
    height: 576,
    lesion_pixels_preserved: true,
    clipped_fraction: 0.002,
    photometry: {
      status: 'ok',
      reason: null,
      region: 'perilesional_ring',
      median_L: 63.2 + deltaL,
      median_b: 14.1,
      ita_deg: 42.5,
      ita_category: 'light',
      category_scheme: 'Chardon 1991 / Del Bino 2006 ITA categories (colorimetric, not Fitzpatrick)',
      n_px: 5321,
      valid_fraction: 0.81,
    },
  };
}
