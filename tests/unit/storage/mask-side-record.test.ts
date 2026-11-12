import { describe, expect, it, vi } from 'vitest';
import { createExamStorage } from '@/core/storage/examStorage';
import { createMemoryAdapter } from '@/core/storage/memoryAdapter';
import { parseStoredExam } from '@/core/storage/schema';
import { reattachMask, splitMask } from '@/core/storage/maskRecord';
import { EXAM_SCHEMA_VERSION, type StoredExam, type ExamStorageAdapter } from '@/core/storage/types';
import type { InferenceResult } from '@/core/inference/types';

const MASK = 'iVBORw0KGgo=';

function resultWith(analysisId: string | undefined): InferenceResult {
  return {
    source: 'live',
    model: 'MOCO_HAM7',
    mode: 'base',
    identity: { modelId: 'dermssl-v10-moco', sha256: null, sha256Verified: null, recipe: null, release: 'v10.0.0' },
    scores: { akiec: 0, bcc: 0, bkl: 0, df: 0, mel: 0, nv: 1, vasc: 0 },
    latencyMs: 1,
    warnings: [],
    analysisId,
    segmentation: {
      status: 'ok',
      source: 'model',
      imageWidth: 1024,
      imageHeight: 768,
      maskWidth: 512,
      maskHeight: 384,
      maskPngBase64: MASK,
      contour: [
        [1, 1],
        [5, 1],
        [5, 5],
      ],
      areaFraction: 0.1,
      threshold: 0.5,
      identity: {
        modelId: 'm',
        run: 'r',
        release: 'v',
        modelSha256: 'b'.repeat(64),
        inputSize: 224,
      },
    },
  };
}

function snapshotWith(result: InferenceResult | null): StoredExam {
  return {
    schemaVersion: EXAM_SCHEMA_VERSION,
    record: {
      id: 'exam-1',
      createdAt: '2026-11-11T00:00:00.000Z',
      bodySite: null,
      abcde: {},
      note: '',
      priorImageId: null,
      lastExport: null,
      registryVersion: 1,
    },
    image: null,
    result,
  };
}

describe('mask side record', () => {
  it('removes the mask from the snapshot and returns it as a separate record', () => {
    const { snapshot, mask } = splitMask(snapshotWith(resultWith('a1')));
    expect(JSON.stringify(snapshot)).not.toContain(MASK);
    expect(mask).toEqual({ analysisId: 'a1', maskPngBase64: MASK });
  });

  it('returns no mask record when the result has no segmentation mask', () => {
    const { mask } = splitMask(snapshotWith(null));
    expect(mask).toBeNull();
  });

  it('reattaches the mask only when the analysis id matches', () => {
    const { snapshot } = splitMask(snapshotWith(resultWith('a1')));
    const restored = reattachMask(snapshot, { analysisId: 'a1', maskPngBase64: MASK });
    expect(restored.result?.segmentation).toMatchObject({ status: 'ok', maskPngBase64: MASK });
    const stale = reattachMask(snapshot, { analysisId: 'other', maskPngBase64: MASK });
    expect(stale.result?.segmentation).not.toHaveProperty('maskPngBase64');
  });

  it('keeps the old-record path: no analysis id means nothing to reattach', () => {
    const { snapshot } = splitMask(snapshotWith(resultWith(undefined)));
    const restored = reattachMask(snapshot, { analysisId: 'a1', maskPngBase64: MASK });
    expect(restored.result?.segmentation).not.toHaveProperty('maskPngBase64');
  });

  it('never writes the mask to the primary adapter and restores it on load', async () => {
    const memory = createMemoryAdapter();
    const spy: ExamStorageAdapter = {
      load: vi.fn(() => memory.load()),
      save: vi.fn((s: StoredExam) => memory.save(s)),
      clear: () => memory.clear(),
      saveMask: vi.fn((m) => memory.saveMask(m)),
      loadMask: () => memory.loadMask(),
    };
    const storage = createExamStorage(spy);
    await storage.save(snapshotWith(resultWith('a1')));
    expect(JSON.stringify(vi.mocked(spy.save).mock.calls)).not.toContain(MASK);
    const loaded = await storage.load();
    expect(loaded?.result?.segmentation).toMatchObject({ maskPngBase64: MASK });
  });
});

describe('stored result validation stays backward compatible', () => {
  it('accepts an old record without segmentation or photometry', () => {
    const old = { ...snapshotWith(null), result: { ...resultWith(undefined), segmentation: undefined } };
    expect(parseStoredExam(old)).not.toBeNull();
  });

  it('rejects a stored segmentation whose contour is malformed', () => {
    const bad = { ...snapshotWith(resultWith('a1')) };
    const seg = bad.result?.segmentation as unknown as { contour: unknown };
    seg.contour = 'nope';
    expect(parseStoredExam(bad)).toBeNull();
  });

  it('rejects a stored photometry with an unknown status', () => {
    const bad = { ...snapshotWith(resultWith('a1')), result: { ...resultWith('a1'), photometry: { status: 'maybe' } } };
    expect(parseStoredExam(bad)).toBeNull();
  });

  it('accepts a stored melanoma-priority screening block', () => {
    const screening = {
      status: 'ok',
      ruleId: 'melanoma-priority-v1',
      target: 'mel',
      logOffset: 1.5,
      pred: 'mel',
      alert: true,
      differsFromPred: true,
      development: null,
    };
    const stored = { ...snapshotWith(resultWith('a1')), result: { ...resultWith('a1'), screening } };
    expect(parseStoredExam(stored)).not.toBeNull();
  });

  it('rejects a stored screening block with a non-boolean alert', () => {
    const screening = { status: 'ok', ruleId: 'r', target: 'mel', logOffset: 1.5, pred: 'mel', alert: 'yes' };
    const bad = { ...snapshotWith(resultWith('a1')), result: { ...resultWith('a1'), screening } };
    expect(parseStoredExam(bad)).toBeNull();
  });
});
