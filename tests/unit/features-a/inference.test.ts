import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLASS_CODES, InferenceError } from '@/core/inference/types';
import { FakeInferenceClient } from '@/features/consent/fakeClient';
import { LiveInferenceClient, scenarioForStatus } from '@/features/consent/liveClient';
import {
  beginAnalysis,
  createInferenceClient,
  finishAnalysis,
  isAnalysisInFlight,
  runAnalysis,
  stopAnalysis,
} from '@/features/consent/api';
import { readMockDeadline, readMockScenario } from '@/features/desk/mockScenario';

const FILE = new Blob(['12345678'], { type: 'image/jpeg' });

function outcome(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    (value) => ({ ok: true, value }),
    (error: unknown) => ({ ok: false, error }),
  );
}

describe('mock contract', () => {
  it('reads only known scenarios and ignores typos', () => {
    expect(readMockScenario('?mock=rate-limit')).toBe('rate-limit');
    expect(readMockScenario('?mock=rate_limit')).toBeNull();
    expect(readMockScenario('')).toBeNull();
  });

  it('honours the deadline override only together with ?mock=', () => {
    expect(readMockDeadline('?mock=timeout&deadline=500')).toBe(500);
    expect(readMockDeadline('?deadline=500')).toBeNull();
  });

  it('selects the fake client from the URL', () => {
    expect(createInferenceClient('?mock=slow')).toBeInstanceOf(FakeInferenceClient);
  });
});

describe('FakeInferenceClient', () => {
  it('returns labelled, deterministic raw scores for the same upload size', async () => {
    const client = new FakeInferenceClient('success');
    const first = await client.predict({ file: FILE });
    const second = await client.predict({ file: FILE });
    expect(first.source).toBe('mock');
    expect(first.scores).toEqual(second.scores);
    for (const code of CLASS_CODES) {
      expect(first.scores[code]).toBeGreaterThanOrEqual(0);
      expect(first.scores[code]).toBeLessThanOrEqual(1);
    }
  });

  it.each([
    ['offline', 'offline'],
    ['server-error', 'server-error'],
    ['invalid-response', 'invalid-response'],
    ['rate-limit', 'rate-limit'],
  ] as const)('maps %s to the %s recovery scenario', async (scenario, expected) => {
    const error = await outcome(new FakeInferenceClient(scenario).predict({ file: FILE }));
    expect(error).toMatchObject({ ok: false, error: expect.any(InferenceError) });
    expect((error as { error: InferenceError }).error.scenario).toBe(expected);
  });

  it('timeout never resolves until the caller aborts', async () => {
    const controller = new AbortController();
    const pending = outcome(new FakeInferenceClient('timeout').predict({ file: FILE, signal: controller.signal }));
    controller.abort();
    expect(await pending).toMatchObject({ ok: false });
  });
});

describe('runAnalysis deadline and cancellation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('rejects with timeout when the deadline passes and aborts the request', async () => {
    const controller = new AbortController();
    const pending = outcome(runAnalysis(new FakeInferenceClient('timeout'), { file: FILE, signal: controller.signal }, 1000));
    await vi.advanceTimersByTimeAsync(1000);
    const result = (await pending) as { ok: false; error: InferenceError };
    expect(result.error).toBeInstanceOf(InferenceError);
    expect(result.error.scenario).toBe('timeout');
  });

  it('rejects with AbortError when the caller stops waiting', async () => {
    const controller = new AbortController();
    const pending = outcome(runAnalysis(new FakeInferenceClient('timeout'), { file: FILE, signal: controller.signal }, 30_000));
    controller.abort();
    const result = (await pending) as { ok: false; error: DOMException };
    expect(result.error.name).toBe('AbortError');
  });
});

describe('single-flight gate (G2)', () => {
  it('allows one analysis at a time and releases it when finished', () => {
    const first = beginAnalysis();
    expect(first).not.toBeNull();
    expect(beginAnalysis()).toBeNull();
    expect(isAnalysisInFlight()).toBe(true);
    if (first) finishAnalysis(first);
    expect(isAnalysisInFlight()).toBe(false);
  });

  it('stopAnalysis aborts the active controller and frees the gate', () => {
    const controller = beginAnalysis();
    expect(controller).not.toBeNull();
    stopAnalysis();
    expect(controller?.signal.aborted).toBe(true);
    expect(isAnalysisInFlight()).toBe(false);
  });
});

describe('LiveInferenceClient', () => {
  const client = new LiveInferenceClient();
  const validScores = Object.fromEntries(CLASS_CODES.map((code, index) => [code, index / 10]));

  afterEach(() => vi.unstubAllGlobals());

  it('maps 429 to rate-limit and 5xx to server-error', () => {
    expect(scenarioForStatus(429)).toBe('rate-limit');
    expect(scenarioForStatus(503)).toBe('server-error');
  });

  it('returns a live result for a response matching the contract', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ scores: validScores }), { status: 200 })));
    const result = await client.predict({ file: FILE, model: 'A71', mode: 'base' });
    expect(result.source).toBe('live');
    expect(result.scores.mel).toBe(validScores.mel);
  });

  it('flags a non-JSON or incomplete body as invalid-response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200 })));
    await expect(client.predict({ file: FILE })).rejects.toMatchObject({ scenario: 'invalid-response' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ scores: { mel: 0.1 } }), { status: 200 })));
    await expect(client.predict({ file: FILE })).rejects.toMatchObject({ scenario: 'invalid-response' });
  });

  it('never retries: a single fetch per user action', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(client.predict({ file: FILE })).rejects.toMatchObject({ scenario: 'server-error' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
