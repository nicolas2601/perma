import { ExifStripError } from '@/core/storage/exif';
import { stripImageMetadata } from '@/core/storage/metadata';
import {
  EXAM_SCHEMA_VERSION,
  type ExamStorageAdapter,
  type StoredExam,
  type StoredImage,
} from '@/core/storage/types';
import type { ExamClock } from './clock';
import type { ExamImage, ExamState } from './contract';
import { createHydratedState, createInitialState } from './state';
import type { ExamRuntimeStore } from './store';

export const AUTOSAVE_DEBOUNCE_MS = 800;

const storedImageCache = new WeakMap<ExamImage, Promise<StoredImage | null>>();

/**
 * Both copies are stripped of EXIF (GPS included) before they reach storage.
 * JPEG, PNG and WebP are scrubbed; any other container cannot be verified clean and is not persisted (null).
 */
export function prepareStoredImage(image: ExamImage): Promise<StoredImage | null> {
  const cached = storedImageCache.get(image);
  if (cached !== undefined) return cached;
  const prepared = stripBothCopies(image);
  storedImageCache.set(image, prepared);
  return prepared;
}

async function stripBothCopies(image: ExamImage): Promise<StoredImage | null> {
  try {
    const [original, upload] = await Promise.all([
      stripImageMetadata(image.original),
      stripImageMetadata(image.upload),
    ]);
    return { original, upload, name: image.name, origin: image.origin };
  } catch (error) {
    if (error instanceof ExifStripError) return null;
    throw error;
  }
}

export async function toStoredExam(state: ExamState): Promise<StoredExam> {
  const image = state.image === null ? null : await prepareStoredImage(state.image);
  return { schemaVersion: EXAM_SCHEMA_VERSION, record: state.record, image, result: state.result };
}

export async function restoreExam(storage: ExamStorageAdapter, clock: ExamClock): Promise<ExamState> {
  const stored = await storage.load();
  if (stored === null) return createInitialState(clock);
  return createHydratedState({ record: stored.record, image: stored.image, result: stored.result ?? null });
}

export interface AutosaveOptions {
  debounceMs?: number;
  onError?: (error: unknown) => void;
}

/**
 * Saves after the record or image changes, debounced. Only those two fields
 * trigger a save; phase, result and consent do not. Saves run one at a time.
 * Returns the detach function.
 */
export function attachAutosave(
  store: ExamRuntimeStore,
  storage: ExamStorageAdapter,
  options: AutosaveOptions = {},
): () => void {
  const delay = options.debounceMs ?? AUTOSAVE_DEBOUNCE_MS;
  const onError = options.onError ?? (() => undefined);
  let watched = store.getState();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queue: Promise<void> = Promise.resolve();

  const persist = async (): Promise<void> => {
    await storage.save(await toStoredExam(store.getState()));
  };
  const flush = (): void => {
    timer = null;
    queue = queue.then(persist).catch(onError);
  };
  const unsubscribe = store.subscribe(() => {
    const state = store.getState();
    if (state.record === watched.record && state.image === watched.image && state.result === watched.result) return;
    const resultChanged = state.result !== watched.result;
    watched = state;
    if (timer !== null) clearTimeout(timer);
    // A fresh model output is saved at once: it cannot be recomputed without a new request.
    timer = setTimeout(flush, resultChanged ? 0 : delay);
  });

  // A tab closed or reloaded inside the debounce window must not lose the last change.
  const flushNow = (): void => {
    if (timer === null) return;
    clearTimeout(timer);
    flush();
  };
  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') flushNow();
  };
  globalThis.addEventListener?.('pagehide', flushNow);
  globalThis.document?.addEventListener('visibilitychange', onVisibility);

  return () => {
    unsubscribe();
    globalThis.removeEventListener?.('pagehide', flushNow);
    globalThis.document?.removeEventListener('visibilitychange', onVisibility);
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
}
