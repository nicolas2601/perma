import { describe, expect, it, vi } from 'vitest';
import { LiveInferenceClient } from '@/core/inference/live';
import { AnalyzeEndpointMissing } from '@/core/inference/errors';
import { InferenceError } from '@/core/inference/types';

// Valid-path tests replay REAL captures from fixtures/api (captured from the v10.1.0 models).
import analyzeRaw from '../../../fixtures/api/analyze-MOCO_HAM7-reference-tschandl-600.json?raw';
import toneRaw from '../../../fixtures/api/simulate-tone-4.86-reference-tschandl-600.json?raw';
const FILE = new Blob(['x'], { type: 'image/jpeg' });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function clientWith(fetchImpl: typeof fetch) {
  return new LiveInferenceClient({ defaultModel: 'MOCO_HAM7', fetchImpl, isOnline: () => true });
}

describe('LiveInferenceClient.analyze: request and error mapping', () => {
  it('posts the file as multipart to /api/analyze for the model', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { code: 'NOT_FOUND' } }, 404));
    await clientWith(fetchImpl as unknown as typeof fetch).analyze({ file: FILE }).catch(() => undefined);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/analyze?model=MOCO_HAM7');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('turns a contract-violating body into invalid-response, never a partial result', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ schema: 'dermssl.analyze.v2' }));
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

  it('maps a real captured analyze body to classification, contour and photometry', async () => {
    const capture = JSON.parse(analyzeRaw) as { segmentation: { contour: unknown[] }; photometry: { ita_deg: number } };
    const fetchImpl = vi.fn(async () => jsonResponse(capture));
    const result = await clientWith(fetchImpl as unknown as typeof fetch).analyze({ file: FILE });
    expect(result.model).toBe('MOCO_HAM7');
    if (result.segmentation?.status !== 'ok' || result.photometry?.status !== 'ok') throw new Error('expected ok');
    expect(result.segmentation.contour).toHaveLength(capture.segmentation.contour.length);
    expect(result.photometry.itaDeg).toBe(capture.photometry.ita_deg);
  });
});

describe('LiveInferenceClient.simulateTone: request and error mapping', () => {
  it('sends the stored mask and the delta to /api/simulate-tone', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { code: 'INVALID_DELTA' } }, 422));
    await clientWith(fetchImpl as unknown as typeof fetch)
      .simulateTone({ file: FILE, maskPngBase64: 'MASK-FIELD', deltaL: -4.86 })
      .catch(() => undefined);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/simulate-tone');
    const form = init.body as FormData;
    expect(form.get('mask_png_base64')).toBe('MASK-FIELD');
    expect(form.get('delta_l')).toBe('-4.86');
  });

  it('refuses deltas that are not tone stops before any request is sent', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}));
    await expect(
      clientWith(fetchImpl as unknown as typeof fetch).simulateTone({ file: FILE, maskPngBase64: 'x', deltaL: -4 }),
    ).rejects.toBeInstanceOf(RangeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps a 422 INVALID_DELTA rejection to a typed InferenceError', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { code: 'INVALID_DELTA' } }, 422));
    const error = await clientWith(fetchImpl as unknown as typeof fetch)
      .simulateTone({ file: FILE, maskPngBase64: 'x', deltaL: 4.86 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InferenceError);
  });

  it('returns the real captured simulate-tone body for a luminance step', async () => {
    const capture = JSON.parse(toneRaw) as { delta_l: number; photometry: { median_L: number } };
    const fetchImpl = vi.fn(async () => jsonResponse(capture));
    const tone = await clientWith(fetchImpl as unknown as typeof fetch).simulateTone({
      file: FILE,
      maskPngBase64: 'MASK',
      deltaL: 4.86,
    });
    expect(tone.deltaL).toBe(capture.delta_l);
    expect(tone.photometry.status).toBe('ok');
  });
});
