import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { LiveInferenceClient } from '@/core/inference/live';
import { InferenceError } from '@/core/inference/types';
import { predictFailure, type HttpFailureScenario } from '@/mocks/msw/scenarios';
import { fixtureJson } from '@/mocks/msw/fixtures';
import { imageBlob, registerApiServer } from './support/apiServer';

const server = registerApiServer();

type LiveOptions = Partial<ConstructorParameters<typeof LiveInferenceClient>[0]>;

const client = (overrides: LiveOptions = {}) => new LiveInferenceClient({ defaultModel: 'MOCO_HAM7', ...overrides });

async function errorFrom(promise: Promise<unknown>): Promise<InferenceError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof InferenceError) return error;
    throw error;
  }
  throw new Error('expected a rejection');
}

describe('LiveInferenceClient: success', () => {
  it('returns the normalized status identity', async () => {
    const identity = await client().status();
    expect(identity).toEqual({
      modelId: 'dermssl-v10-moco',
      sha256: 'eb41e67f472a1491a6970246e59f6db8c0276c79fdd190c68fb25e3b3f80dd7a',
      sha256Verified: null,
      recipe: 'cls4 | tau=0 | none | n=1',
      release: 'v10.0.0',
    });
  });

  it('predicts base from the captured MoCo body, with measured latency', async () => {
    const base = await client().predict({ file: imageBlob(), model: 'MOCO_HAM7', mode: 'base' });
    expect(base).toMatchObject({ source: 'live', model: 'MOCO_HAM7', mode: 'base', warnings: ['identity-unverified'] });
    expect(base.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('sends model, mode and the file as multipart field "file" to the same origin', async () => {
    // jsdom's FormData stringifies a Blob, so only the field name is asserted here.
    // Real byte transfer is covered by the browser e2e run, not by this unit test.
    let seen: { path: string; mode: string | null; multipart: string } | undefined;
    server.use(
      http.post('/api/predict', async ({ request }) => {
        const url = new URL(request.url);
        const multipart = await request.text();
        seen = { path: url.pathname, mode: url.searchParams.get('mode'), multipart };
        return HttpResponse.json(fixtureJson('mocoPredict'));
      }),
    );
    await client().predict({ file: imageBlob(), model: 'MOCO_HAM7', mode: 'base' });
    expect(seen?.path).toBe('/api/predict');
    expect(seen?.mode).toBe('base');
    expect(seen?.multipart).toContain('name="file"');
  });

  it('uses the configured default model and base mode when the request omits them', async () => {
    let model: string | null = null;
    server.use(
      http.post('/api/predict', ({ request }) => {
        model = new URL(request.url).searchParams.get('model');
        return HttpResponse.json(fixtureJson('mocoPredict'));
      }),
    );
    await client().predict({ file: imageBlob() });
    expect(model).toBe('MOCO_HAM7');
  });

  it('refuses the mock-only model before any request', () => {
    expect(() => client({ defaultModel: 'next' })).toThrow(RangeError);
  });
});

describe('LiveInferenceClient: HTTP and network mapping', () => {
  const cases: Array<[HttpFailureScenario, InferenceError['scenario']]> = [
    ['rate-limit', 'rate-limit'],
    ['server-error', 'server-error'],
    ['file-unavailable', 'file-unavailable'],
    ['permission', 'permission'],
    ['offline', 'offline'],
    ['invalid-response', 'invalid-response'],
  ];

  it.each(cases)('maps %s to %s', async (failure, expected) => {
    server.use(predictFailure(failure));
    const error = await errorFrom(client().predict({ file: imageBlob(), model: 'MOCO_HAM7' }));
    expect(error.scenario).toBe(expected);
  });

  it('maps a 422 missing-field response to file-unavailable (real probe body)', async () => {
    server.use(
      http.post('/api/predict', () => HttpResponse.json(fixtureJson('probeNoFile'), { status: 422 })),
    );
    const error = await errorFrom(client().predict({ file: imageBlob(), model: 'MOCO_HAM7' }));
    expect(error.scenario).toBe('file-unavailable');
  });

  it('reports offline without sending a request when the browser has no network', async () => {
    const hits = vi.fn();
    server.use(http.post('/api/predict', () => (hits(), HttpResponse.json(fixtureJson('mocoPredict')))));
    const error = await errorFrom(client({ isOnline: () => false }).predict({ file: imageBlob(), model: 'MOCO_HAM7' }));
    expect(error.scenario).toBe('offline');
    expect(hits).not.toHaveBeenCalled();
  });

  it('maps the 60 s timeout (shortened here) to timeout', async () => {
    server.use(predictFailure('timeout'));
    const error = await errorFrom(client({ timeoutMs: 50 }).predict({ file: imageBlob(), model: 'MOCO_HAM7' }));
    expect(error.scenario).toBe('timeout');
  });

  it('rethrows a caller abort untouched, not as a recovery scenario', async () => {
    server.use(predictFailure('timeout'));
    const controller = new AbortController();
    const pending = client({ timeoutMs: 60_000 }).predict({ file: imageBlob(), model: 'MOCO_HAM7', signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('LiveInferenceClient: schema and identity guards', () => {
  it('turns a non-JSON 200 body into invalid-response', async () => {
    server.use(predictFailure('invalid-response'));
    const error = await errorFrom(client().predict({ file: imageBlob(), model: 'MOCO_HAM7' }));
    expect(error.scenario).toBe('invalid-response');
  });

  it('turns a schema-broken 200 body into invalid-response (never partial)', async () => {
    const broken = { ...(fixtureJson('mocoPredict') as Record<string, unknown>), probs: { nv: 0.5 } };
    server.use(http.post('/api/predict', () => HttpResponse.json(broken)));
    const error = await errorFrom(client().predict({ file: imageBlob(), model: 'MOCO_HAM7' }));
    expect(error.scenario).toBe('invalid-response');
  });

  it('rejects a valid body that answers for a different model than requested', async () => {
    server.use(http.post('/api/predict', () => HttpResponse.json({ ...(fixtureJson('mocoPredict') as object), model_key: 'A71' })));
    const error = await errorFrom(client().predict({ file: imageBlob(), model: 'MOCO_HAM7' }));
    expect(error.scenario).toBe('invalid-response');
  });

  it('refuses to report a not-ready model as healthy', async () => {
    const status = { ...(fixtureJson('mocoStatus') as Record<string, unknown>), classification_ready: false, reason: 'loading' };
    server.use(http.get('/api/status', () => HttpResponse.json(status)));
    const error = await errorFrom(client().status());
    expect(error.scenario).toBe('server-error');
  });
});
