import { expect, it, vi } from 'vitest';
import { createInferenceClient } from '@/core/inference/factory';
import { fixtureJson } from '@/mocks/msw/fixtures';
import statusRaw from '../../../fixtures/api/status-MOCO_HAM7.json?raw';
import predictRaw from '../../../fixtures/api/predict-MOCO_HAM7-base.json?raw';
import { imageBlob } from './support/apiServer';

it('submits the default image request to MoCo and accepts the captured V10 result', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(predictRaw));
  try {
    const result = await createInferenceClient({ env: {}, search: '' }).predict({ file: imageBlob() });
    expect(fetchSpy).toHaveBeenCalledWith(`${location.origin}/api/predict?model=MOCO_HAM7&mode=base`, expect.any(Object));
    expect(result).toMatchObject({
      source: 'live', model: 'MOCO_HAM7', mode: 'base',
      identity: { modelId: 'dermssl-v10-moco', release: 'v10.0.0', sha256Verified: null },
      scores: JSON.parse(predictRaw).probs,
    });
  } finally {
    fetchSpy.mockRestore();
  }
});

it('requests status for the configured MoCo model rather than the server default', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(statusRaw));
  try {
    const identity = await createInferenceClient({ env: {}, search: '' }).status();
    expect(fetchSpy).toHaveBeenCalledWith(`${location.origin}/api/status?model=MOCO_HAM7`, expect.any(Object));
    expect(identity).toMatchObject({ modelId: 'dermssl-v10-moco', sha256Verified: null });
  } finally {
    fetchSpy.mockRestore();
  }
});

it('rejects a healthy status that reports a retired model instead of claiming MoCo is ready', async () => {
  const body = { ...(fixtureJson('mocoStatus') as object), model_key: 'B71' };
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body));
  try {
    await expect(createInferenceClient({ env: {}, search: '' }).status()).rejects.toMatchObject({ scenario: 'invalid-response' });
  } finally {
    fetchSpy.mockRestore();
  }
});

it.each(['A71', 'B71', 'MOCO_PAD6'])('refuses unsupported live configuration %s before uploading', (model) => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  try {
    expect(() => createInferenceClient({ env: { VITE_DEFAULT_MODEL: model }, search: '' })).toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});

it.each([
  { ...JSON.parse(predictRaw), requested_mode: 'tta', mode: 'tta' },
  { ...JSON.parse(predictRaw), probs: { nv: 0.7 } },
  { ...JSON.parse(predictRaw), model_key: 'MOCO_PAD6' },
])('rejects a stale or incompatible prediction without relabeling it', async (body) => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(body));
  try {
    await expect(createInferenceClient({ env: {}, search: '' }).predict({ file: imageBlob() })).rejects.toMatchObject({ scenario: 'invalid-response' });
  } finally {
    fetchSpy.mockRestore();
  }
});
