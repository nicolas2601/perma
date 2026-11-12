import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MockInferenceClient, SIMULATED_WARNING } from '@/core/inference/mock';
import { InferenceError } from '@/core/inference/types';
import { fixtureJson } from '@/mocks/msw/fixtures';
import analyzeRaw from '../../../fixtures/api/analyze-MOCO_HAM7-reference-tschandl-600.json?raw';
import toneRaw from '../../../fixtures/api/simulate-tone-4.86-reference-tschandl-600.json?raw';

const make = (scenario?: 'success' | 'slow' | 'offline', extra: { slowDelayMs?: number; failureDelayMs?: number } = {}) =>
  new MockInferenceClient({ defaultModel: 'MOCO_HAM7', scenario, failureDelayMs: 0, ...extra });

const imageBlob = (text = 'image') => new Blob([text], { type: 'image/jpeg' });

describe('MockInferenceClient: replays real captures, invents nothing', () => {
  beforeAll(() => vi.stubEnv('VITE_INFERENCE', 'mock'));
  afterAll(() => vi.unstubAllEnvs());

  it('replays the captured MOCO_HAM7 predict scores and labels them as mock', async () => {
    const result = await make().predict({ file: imageBlob() });
    const captured = fixtureJson('mocoPredict') as { probs: Record<string, number> };
    expect(result.scores).toEqual(captured.probs);
    expect(result).toMatchObject({ source: 'mock', model: 'MOCO_HAM7', mode: 'base' });
    expect(result.warnings).toContain(SIMULATED_WARNING);
  });

  it('gives the same answer for the same input (replay is deterministic)', async () => {
    const a = await make().predict({ file: imageBlob('same') });
    const b = await make().predict({ file: imageBlob('same') });
    expect(a.scores).toEqual(b.scores);
  });

  it('replays the real analyze capture as mock, with its contour and photometry', async () => {
    const result = await make().analyze({ file: imageBlob() });
    const capture = JSON.parse(analyzeRaw) as { segmentation: { contour: unknown[] }; photometry: { ita_deg: number } };
    expect(result.source).toBe('mock');
    expect(result.segmentation).toMatchObject({ status: 'ok', source: 'mock' });
    if (result.segmentation?.status !== 'ok') throw new Error('expected ok segmentation');
    expect(result.segmentation.contour).toHaveLength(capture.segmentation.contour.length);
    if (result.photometry?.status !== 'ok') throw new Error('expected ok photometry');
    expect(result.photometry.itaDeg).toBe(capture.photometry.ita_deg);
  });

  it('replays the real tone capture for a luminance step', async () => {
    const tone = await make().simulateTone({ file: imageBlob(), maskPngBase64: 'x', deltaL: 4.86 });
    const capture = JSON.parse(toneRaw) as { delta_l: number; width: number };
    expect(tone).toMatchObject({ source: 'mock', deltaL: capture.delta_l, width: capture.width });
  });

  it('refuses a tone for delta 0: the original is shown and the service is never called', async () => {
    const error = await make()
      .simulateTone({ file: imageBlob(), maskPngBase64: 'x', deltaL: 0 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(InferenceError);
    expect((error as InferenceError).scenario).toBe('file-unavailable');
  });

  it('refuses a delta that is not a tone stop', async () => {
    await expect(
      make().simulateTone({ file: imageBlob(), maskPngBase64: 'x', deltaL: 4 }),
    ).rejects.toBeInstanceOf(RangeError);
  });
});

describe('MockInferenceClient: failure scenarios and slow delay', () => {
  beforeAll(() => vi.stubEnv('VITE_INFERENCE', 'mock'));
  afterAll(() => vi.unstubAllEnvs());

  it('throws the requested recovery scenario', async () => {
    await expect(make('offline').predict({ file: imageBlob() })).rejects.toMatchObject({ scenario: 'offline' });
  });

  it('resolves the slow scenario after a seeded delay between 14 and 16 seconds', async () => {
    vi.useFakeTimers();
    const pending = make('slow').predict({ file: imageBlob('slow-case') });
    await vi.advanceTimersByTimeAsync(16_000);
    const result = await pending;
    expect(result.latencyMs).toBe(0);
    vi.useRealTimers();
  });

  it('honours an explicit slow delay override', async () => {
    vi.useFakeTimers();
    const pending = make('slow', { slowDelayMs: 250 }).predict({ file: imageBlob() });
    await vi.advanceTimersByTimeAsync(250);
    await expect(pending).resolves.toMatchObject({ source: 'mock' });
    vi.useRealTimers();
  });

  it('rejects with the caller abort reason while the slow request is pending', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const pending = make('slow', { slowDelayMs: 5_000 }).predict({ file: imageBlob(), signal: controller.signal });
    controller.abort('user-stopped');
    await expect(pending).rejects.toBe('user-stopped');
    vi.useRealTimers();
  });
});
