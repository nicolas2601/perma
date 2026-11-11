import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/core/exam/state';
import { fixedClock, makeResult } from '../exam/fixtures';
import { buildJsonDocument, serializeJson, EXPORT_SCHEMA_VERSION } from '@/core/export/json';
import { buildCsvRows } from '@/core/export/csv';
import { copyRegistry, translate } from '@/core/i18n/registry';
import type { ExportSnapshot } from '@/core/export/types';
import type { InferenceResult, PhotometryResult, SegmentationResult } from '@/core/inference/types';

const exportedAt = new Date('2026-11-05T12:00:00.000Z');
const t = (key: Parameters<typeof translate>[2]) => translate(copyRegistry, 'es', key);
const MASK_SECRET = 'SECRET-MASK-PNG';

const SEGMENTATION: SegmentationResult = {
  status: 'ok',
  source: 'model',
  imageWidth: 1024,
  imageHeight: 768,
  maskWidth: 512,
  maskHeight: 384,
  maskPngBase64: MASK_SECRET,
  contour: [
    [1, 2],
    [3, 4],
    [5, 6],
  ],
  areaFraction: 0.183,
  threshold: 0.5,
  identity: { modelId: 'dermlip-resnet34-unet-teacher', run: 'run-1', release: 'v10.2.0', modelSha256: 'b'.repeat(64), inputSize: 224 },
};

const PHOTOMETRY: PhotometryResult = {
  status: 'ok',
  region: 'perilesional_ring',
  medianL: 63.2,
  medianB: 14.1,
  itaDeg: 42.5,
  itaCategory: 'light',
  nPx: 5321,
  validFraction: 0.81,
};

function liveResult(): InferenceResult {
  return { ...makeResult('live'), segmentation: SEGMENTATION, photometry: PHOTOMETRY };
}

function snapshotWith(result: InferenceResult | null): ExportSnapshot {
  const record = createInitialState(fixedClock()).record;
  return { record, image: { name: 'lesion.jpg', origin: 'file' }, result };
}

describe('explainability export', () => {
  it('bumps the export schema version for the new fields', () => {
    expect(EXPORT_SCHEMA_VERSION).toBe(2);
  });

  it('exports photometry values and the model segmentation summary for a live result', () => {
    const doc = buildJsonDocument(snapshotWith(liveResult()), exportedAt, t);
    expect(doc.result?.photometry).toMatchObject({ status: 'ok', itaDeg: 42.5, itaCategory: 'light', medianL: 63.2 });
    expect(doc.result?.segmentation).toMatchObject({ source: 'model', status: 'ok', areaFraction: 0.183 });
    expect(doc.result?.segmentation?.identity).toMatchObject({ modelId: 'dermlip-resnet34-unet-teacher', release: 'v10.2.0' });
  });

  it('never serialises the mask or the contour', () => {
    const text = serializeJson(buildJsonDocument(snapshotWith(liveResult()), exportedAt, t));
    expect(text).not.toContain(MASK_SECRET);
    expect(text).not.toContain('"contour"');
    expect(text).not.toContain('"maskPngBase64"');
  });

  it('exports an unavailable endpoint as an unavailable reason, not as a value', () => {
    const result = {
      ...makeResult('live'),
      segmentation: { status: 'unavailable', source: 'model', reason: 'endpoint_missing' },
      photometry: { status: 'unavailable', reason: 'endpoint_missing' },
    } as InferenceResult;
    const doc = buildJsonDocument(snapshotWith(result), exportedAt, t);
    expect(doc.result?.photometry).toEqual({ status: 'unavailable', reason: 'endpoint_missing' });
    expect(doc.result?.segmentation).toEqual({ status: 'unavailable', source: 'model', reason: 'endpoint_missing' });
  });

  it('never exports simulated (mock) explainability as real values', () => {
    const mock = { ...liveResult(), source: 'mock' } as InferenceResult;
    const doc = buildJsonDocument(snapshotWith(mock), exportedAt, t);
    expect(doc.simulated).toBe(true);
    expect(doc.result?.photometry).toBeNull();
    expect(doc.result?.segmentation).toBeNull();
  });

  it('adds photometry rows to the CSV for live results only', () => {
    const rows = buildCsvRows(snapshotWith(liveResult()), exportedAt, t);
    const values = rows.map((row) => row[2]);
    expect(values).toContain('42.5');
    expect(values).toContain('Clara');
    expect(rows.flat().join('|')).not.toContain(MASK_SECRET);
    const mockRows = buildCsvRows(snapshotWith({ ...liveResult(), source: 'mock' } as InferenceResult), exportedAt, t);
    expect(mockRows.map((row) => row[2])).not.toContain('42.5');
  });
});
