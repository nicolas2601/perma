import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockInferenceClient, SIMULATED_WARNING } from '@/core/inference/mock';
import { MOCK_SCENARIOS, type MockScenario, isFailureScenario } from '@/core/inference/mockScenario';
import { CLASS_CODES, InferenceError } from '@/core/inference/types';
import { imageBlob } from './support/apiServer';

const make = (scenario?: MockScenario, extra: { slowDelayMs?: number; failureDelayMs?: number } = {}) =>
  new MockInferenceClient({ defaultModel: 'B71', scenario, failureDelayMs: 0, ...extra });

afterEach(() => {
  vi.useRealTimers();
});

describe('MockInferenceClient: success and determinism', () => {
  it('always tags results as mock with a simulated identity and never a real sha256', async () => {
    const result = await make().predict({ file: imageBlob(), model: 'A71', mode: 'base' });
    expect(result).toMatchObject({
      source: 'mock',
      model: 'A71',
      mode: 'base',
      warnings: [SIMULATED_WARNING],
      identity: { modelId: 'simulated-A71', sha256: null, sha256Verified: false },
    });
  });

  it('returns the same scores for the same bytes, model and mode', async () => {
    const a = await make().predict({ file: imageBlob('same'), model: 'B71', mode: 'tta' });
    const b = await make().predict({ file: imageBlob('same'), model: 'B71', mode: 'tta' });
    expect(a.scores).toEqual(b.scores);
  });

  it('changes scores when the image bytes, model or mode change', async () => {
    const base = await make().predict({ file: imageBlob('one'), model: 'B71', mode: 'base' });
    const otherImage = await make().predict({ file: imageBlob('two'), model: 'B71', mode: 'base' });
    const otherModel = await make().predict({ file: imageBlob('one'), model: 'A71', mode: 'base' });
    const otherMode = await make().predict({ file: imageBlob('one'), model: 'B71', mode: 'tta' });
    expect(otherImage.scores).not.toEqual(base.scores);
    expect(otherModel.scores).not.toEqual(base.scores);
    expect(otherMode.scores).not.toEqual(base.scores);
  });

  it('returns all seven class scores, each in [0, 1]', async () => {
    const result = await make().predict({ file: imageBlob(), model: 'next', mode: 'base' });
    expect(Object.keys(result.scores).sort()).toEqual([...CLASS_CODES].sort());
    for (const value of Object.values(result.scores)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('defaults the model and mode from the configured default when omitted', async () => {
    const result = await make().predict({ file: imageBlob() });
    expect(result).toMatchObject({ model: 'B71', mode: 'base' });
  });
});

describe('MockInferenceClient: failure scenarios', () => {
  const failures = MOCK_SCENARIOS.filter(isFailureScenario);

  it.each(failures)('rejects with InferenceError carrying the %s scenario', async (scenario) => {
    const error = await make(scenario)
      .predict({ file: imageBlob(), model: 'B71', mode: 'base' })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InferenceError);
    expect((error as InferenceError).scenario).toBe(scenario);
  });

  it('reports status as the simulated identity regardless of the predict scenario', async () => {
    await expect(make('offline').status()).resolves.toMatchObject({ sha256Verified: false });
  });
});

describe('MockInferenceClient: slow and abort', () => {
  it('resolves the slow scenario after a seeded delay between 6 and 12 seconds', async () => {
    vi.useFakeTimers();
    const pending = make('slow', { failureDelayMs: 0 }).predict({ file: imageBlob('slow-case'), model: 'B71' });
    await vi.advanceTimersByTimeAsync(12_000);
    const result = await pending;
    expect(result.latencyMs).toBeGreaterThanOrEqual(6_000);
    expect(result.latencyMs).toBeLessThanOrEqual(12_000);
    expect(result.source).toBe('mock');
  });

  it('honours an explicit slow delay override', async () => {
    vi.useFakeTimers();
    const pending = make('slow', { slowDelayMs: 250 }).predict({ file: imageBlob(), model: 'B71' });
    await vi.advanceTimersByTimeAsync(250);
    await expect(pending).resolves.toMatchObject({ latencyMs: 250 });
  });

  it('rejects with the caller reason when aborted during the wait', async () => {
    const controller = new AbortController();
    const pending = make('slow', { slowDelayMs: 5_000 }).predict({
      file: imageBlob(),
      model: 'B71',
      signal: controller.signal,
    });
    controller.abort(new Error('user cancelled'));
    await expect(pending).rejects.toThrow('user cancelled');
  });
});
