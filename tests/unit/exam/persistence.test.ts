import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExamRuntime } from '@/core/exam/runtime';
import { attachAutosave, prepareStoredImage, restoreExam, toStoredExam } from '@/core/exam/persistence';
import { createExamStore } from '@/core/exam/store';
import { createInitialState } from '@/core/exam/state';
import { createExamStorage } from '@/core/storage/examStorage';
import { createMemoryAdapter } from '@/core/storage/memoryAdapter';
import type { ExamStorageAdapter } from '@/core/storage/types';
import { containsAscii, fakeJpeg, GPS_MARKER } from '../storage/jpeg';
import { fixedClock, makeImage, run } from './fixtures';
import type { ExamImage } from '@/core/exam/contract';

const clock = fixedClock();
const DEBOUNCE_MS = 800;

/** A JPEG-backed image: persistence only keeps images it can verify as JPEG. */
function jpegImage(): ExamImage {
  const jpeg = () => new Blob([fakeJpeg({ withGps: true })], { type: 'image/jpeg' });
  return makeImage({ original: jpeg(), upload: jpeg() });
}

describe('image privacy on the way to storage', () => {
  it('strips GPS from both copies of a JPEG before persisting', async () => {
    const image = makeImage({
      original: new Blob([fakeJpeg({ withGps: true })], { type: 'image/jpeg' }),
      upload: new Blob([fakeJpeg({ withGps: true })], { type: 'image/jpeg' }),
    });
    const stored = await prepareStoredImage(image);
    expect(stored).not.toBeNull();
    for (const copy of [stored!.original, stored!.upload]) {
      expect(containsAscii(new Uint8Array(await copy.arrayBuffer()), GPS_MARKER)).toBe(false);
    }
  });

  it('does not persist a non-JPEG image rather than storing it unverified', async () => {
    const png = makeImage({
      original: new Blob([new Uint8Array([0x89, 0x50])], { type: 'image/png' }),
      upload: new Blob([new Uint8Array([0x89, 0x50])], { type: 'image/png' }),
    });
    expect(await prepareStoredImage(png)).toBeNull();
  });

  it('builds a snapshot without an image when the image cannot be verified', async () => {
    const reviewing = run(createInitialState(clock), clock, {
      type: 'IMAGE_LOADED',
      image: makeImage({ original: new Blob([new Uint8Array([0x89])]), upload: new Blob([new Uint8Array([0x89])]) }),
    });
    const snapshot = await toStoredExam(reviewing);
    expect(snapshot.image).toBeNull();
    expect(snapshot.record).toBe(reviewing.record);
  });
});

describe('restore', () => {
  it('starts a clean record when nothing is stored', async () => {
    const state = await restoreExam(createMemoryAdapter(), clock);
    expect(state.phase).toBe('idle');
  });

  it('restores the record and returns the user to review when an image survived', async () => {
    const adapter = createMemoryAdapter();
    const withImage = run(
      createInitialState(clock),
      clock,
      { type: 'SET_SITE', site: 'pierna' },
      { type: 'IMAGE_LOADED', image: jpegImage() },
    );
    await adapter.save(await toStoredExam(withImage));
    const restored = await restoreExam(adapter, clock);
    expect(restored.phase).toBe('reviewing');
    expect(restored.record.bodySite).toBe('pierna');
  });
});

describe('autosave', () => {
  let saves: ReturnType<typeof vi.fn>;
  let adapter: ExamStorageAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    adapter = createMemoryAdapter();
    saves = vi.spyOn(adapter, 'save') as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces record changes into a single save', async () => {
    const store = createExamStore(createInitialState(clock), clock);
    attachAutosave(store, adapter, { debounceMs: DEBOUNCE_MS });
    store.dispatch({ type: 'SET_SITE', site: 'a' });
    store.dispatch({ type: 'SET_SITE', site: 'b' });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
    expect(saves).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(saves).toHaveBeenCalledTimes(1);
    expect(saves.mock.calls[0]?.[0].record.bodySite).toBe('b');
  });

  it('does not save for phase-only changes', async () => {
    const store = createExamStore(createInitialState(clock), clock);
    attachAutosave(store, adapter, { debounceMs: DEBOUNCE_MS });
    store.dispatch({ type: 'SET_SITE', site: 'a' });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    saves.mockClear();
    store.dispatch({ type: 'START_CAPTURE' });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(saves).not.toHaveBeenCalled();
  });

  it('stops after detach, so a pending save never fires', async () => {
    const store = createExamStore(createInitialState(clock), clock);
    const detach = attachAutosave(store, adapter, { debounceMs: DEBOUNCE_MS });
    store.dispatch({ type: 'SET_SITE', site: 'a' });
    detach();
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
    expect(saves).not.toHaveBeenCalled();
  });

  it('reports a failed save through onError and keeps working', async () => {
    const onError = vi.fn();
    const failing: ExamStorageAdapter = {
      load: async () => null,
      save: vi.fn().mockRejectedValueOnce(new Error('disk')).mockResolvedValue(undefined),
      clear: async () => undefined,
      saveMask: async () => undefined,
      loadMask: async () => null,
    };
    const store = createExamStore(createInitialState(clock), clock);
    attachAutosave(store, failing, { debounceMs: DEBOUNCE_MS, onError });
    store.dispatch({ type: 'SET_SITE', site: 'a' });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(onError).toHaveBeenCalledTimes(1);
    store.dispatch({ type: 'SET_SITE', site: 'b' });
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(failing.save).toHaveBeenCalledTimes(2);
  });
});

describe('exam runtime', () => {
  it('hydrates from storage and enables autosave only after restore', async () => {
    const storage = createExamStorage(null);
    await storage.save(await toStoredExam(run(createInitialState(clock), clock, { type: 'SET_SITE', site: 'brazo' })));
    const runtime = createExamRuntime({ storage, clock, debounceMs: 0 });
    await runtime.ready;
    expect(runtime.store.getState().record.bodySite).toBe('brazo');
    expect(runtime.storage.status().mode).toBe('memory');
    runtime.dispose();
  });

  it('degrades to memory when the primary cannot load and never writes over unread data', async () => {
    const broken: ExamStorageAdapter = {
      load: vi.fn().mockRejectedValue(new Error('corrupt')),
      save: vi.fn(async () => undefined),
      clear: async () => undefined,
      saveMask: async () => undefined,
      loadMask: async () => null,
    };
    const runtime = createExamRuntime({ storage: createExamStorage(broken), clock, debounceMs: 0 });
    await runtime.ready;
    expect(runtime.storage.status()).toEqual({ mode: 'memory', reason: 'Error' });
    runtime.store.dispatch({ type: 'SET_SITE', site: 'x' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(broken.save).not.toHaveBeenCalled();
    runtime.dispose();
  });
});
