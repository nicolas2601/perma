import { describe, expect, it, vi } from 'vitest';
import { LiveInferenceClient } from '@/core/inference/live';
import { AnalyzeEndpointMissing } from '@/core/inference/errors';
import { InferenceError } from '@/core/inference/types';
import { syntheticAnalyzeBody, syntheticSimulateBody } from '@/mocks/msw/analyzeFixtures';

const FILE = new Blob(['x'], { type: 'image/jpeg' });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function clientWith(fetchImpl: typeof fetch) {
  return new LiveInferenceClient({ defaultModel: 'MOCO_HAM7', fetchImpl, isOnline: () => true });
}

describe('LiveInferenceClient.analyze', () => {
  it('posts the file to /api/analyze and returns classification plus explainability', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(syntheticAnalyzeBody()));
    const result = await clientWith(fetchImpl as unknown as typeof fetch).analyze({ file: FILE });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/analyze?model=MOCO_HAM7');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(result.model).toBe('MOCO_HAM7');
    expect(result.segmentation?.status).toBe('ok');
    expect(result.photometry?.status).toBe('ok');
  });

  it('turns a contract-violating body into invalid-response, never a partial result', async () => {
    const bad = syntheticAnalyzeBody({ schema: 'dermssl.analyze.v2' });
    const fetchImpl = vi.fn(async () => jsonResponse(bad));
    const error = await clientWith(fetchImpl as unknown as typeof fetch)
      .analyze({ file: FILE })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InferenceError);
    expect((error as InferenceError).scenario).toBe('invalid-response');
  });

  it('reports a missing analyze endpoint as AnalyzeEndpointMissing so the caller can fall back to predict', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { code: 'NOT_FOUND' } }, 404));
    const error = await clientWith(fetchImpl as unknown as typeof fetch)
      .analyze({ file: FILE })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AnalyzeEndpointMissing);
  });
});

describe('LiveInferenceClient.simulateTone', () => {
  it('sends the stored mask and delta to /api/simulate-tone', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(syntheticSimulateBody(-8)));
    const response = await clientWith(fetchImpl as unknown as typeof fetch).simulateTone({
      file: FILE,
      maskPngBase64: 'iVBORw0KGgo=',
      deltaL: -8,
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/simulate-tone');
    const form = init.body as FormData;
    expect(form.get('mask_png_base64')).toBe('iVBORw0KGgo=');
    expect(form.get('delta_l')).toBe('-8');
    expect(response.deltaL).toBe(-8);
  });

  it('refuses deltas that are not tone stops before any request is sent', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(syntheticSimulateBody(-8)));
    await expect(
      clientWith(fetchImpl as unknown as typeof fetch).simulateTone({ file: FILE, maskPngBase64: 'x', deltaL: -4 }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps a 422 INVALID_DELTA rejection to a typed InferenceError', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { code: 'INVALID_DELTA' } }, 422));
    const error = await clientWith(fetchImpl as unknown as typeof fetch)
      .simulateTone({ file: FILE, maskPngBase64: 'x', deltaL: 8 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InferenceError);
  });
});
