import { describe, expect, it, vi } from 'vitest';
import { analyzeWith } from '@/core/inference/analyzeFlow';
import { AnalyzeEndpointMissing } from '@/core/inference/errors';
import { InferenceError, type InferenceClient, type InferenceResult } from '@/core/inference/types';

const FILE = new Blob(['x'], { type: 'image/jpeg' });

function predictResult(): InferenceResult {
  return {
    source: 'live',
    model: 'MOCO_HAM7',
    mode: 'base',
    identity: { modelId: 'dermssl-v10-moco', sha256: null, sha256Verified: null, recipe: null, release: 'v10.0.0' },
    scores: { akiec: 0, bcc: 0, bkl: 0, df: 0, mel: 0, nv: 1, vasc: 0 },
    latencyMs: 10,
    warnings: [],
  };
}

function fakeClient(overrides: Partial<InferenceClient>): InferenceClient {
  return {
    source: 'live',
    status: vi.fn(),
    predict: vi.fn(async () => predictResult()),
    analyze: vi.fn(async () => predictResult()),
    simulateTone: vi.fn(),
    ...overrides,
  } as unknown as InferenceClient;
}

describe('analyzeWith: endpoint fallback', () => {
  it('returns the analyze result untouched when the endpoint exists', async () => {
    const analyzed: InferenceResult = {
      ...predictResult(),
      segmentation: { status: 'unavailable', source: 'model', reason: 'empty_mask' },
    };
    const client = fakeClient({ analyze: vi.fn(async () => analyzed) });
    const result = await analyzeWith(client, FILE);
    expect(result).toBe(analyzed);
    expect(client.predict).not.toHaveBeenCalled();
  });

  it('falls back to predict on a missing endpoint and marks explainability endpoint_missing', async () => {
    const client = fakeClient({
      analyze: vi.fn(async () => {
        throw new AnalyzeEndpointMissing();
      }),
    });
    const result = await analyzeWith(client, FILE);
    expect(client.predict).toHaveBeenCalledTimes(1);
    expect(result.model).toBe('MOCO_HAM7');
    expect(result.segmentation).toEqual({ status: 'unavailable', source: 'model', reason: 'endpoint_missing' });
    expect(result.photometry).toEqual({ status: 'unavailable', reason: 'endpoint_missing' });
  });

  it('does not fall back on other failures; they keep their recovery scenario', async () => {
    const client = fakeClient({
      analyze: vi.fn(async () => {
        throw new InferenceError('timeout', 'slow');
      }),
    });
    await expect(analyzeWith(client, FILE)).rejects.toMatchObject({ scenario: 'timeout' });
    expect(client.predict).not.toHaveBeenCalled();
  });
});
