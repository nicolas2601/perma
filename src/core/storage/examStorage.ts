import { createMemoryAdapter } from './memoryAdapter';
import { reattachMask, splitMask } from './maskRecord';
import type { ExamStorageAdapter, StoredExam } from './types';

export type StorageMode = 'indexeddb' | 'memory';

export interface StorageStatus {
  mode: StorageMode;
  /** Null when running on the primary store. Otherwise the error name that forced the fallback. */
  reason: string | null;
}

export interface ExamStorage extends ExamStorageAdapter {
  status(): StorageStatus;
}

export const UNAVAILABLE_REASON = 'indexeddb-unavailable';

/**
 * Wraps the primary adapter with an in-memory fallback. On the first primary
 * failure the store degrades to memory for the rest of the session and records
 * why (the flag the UI can show). A failure in memory itself is rethrown.
 */
export function createExamStorage(primary: ExamStorageAdapter | null): ExamStorage {
  const memory = createMemoryAdapter();
  let active: ExamStorageAdapter = primary ?? memory;
  let state: StorageStatus = primary
    ? { mode: 'indexeddb', reason: null }
    : { mode: 'memory', reason: UNAVAILABLE_REASON };

  const degrade = (error: unknown): void => {
    active = memory;
    state = { mode: 'memory', reason: errorName(error) };
  };

  async function run<T>(operation: (adapter: ExamStorageAdapter) => Promise<T>): Promise<T> {
    if (active === memory) return operation(memory);
    try {
      return await operation(active);
    } catch (error) {
      degrade(error);
      return operation(memory);
    }
  }

  return {
    status: () => state,
    load: () => loadWithMask(run),
    save: (snapshot: StoredExam) => saveWithMask(run, snapshot),
    clear: () => run((adapter) => adapter.clear()),
    saveMask: (mask) => run((adapter) => adapter.saveMask(mask)),
    loadMask: () => run((adapter) => adapter.loadMask()),
  };
}

type Run = <T>(operation: (adapter: ExamStorageAdapter) => Promise<T>) => Promise<T>;

/** The mask goes to its own side record; the exam JSON never carries it. */
async function saveWithMask(run: Run, snapshot: StoredExam): Promise<void> {
  const { snapshot: stripped, mask } = splitMask(snapshot);
  // Snapshot first: an interrupted write leaves an analysisId mismatch, which restores no mask (safe).
  await run((adapter) => adapter.save(stripped));
  await run((adapter) => adapter.saveMask(mask));
}

async function loadWithMask(run: Run): Promise<StoredExam | null> {
  const snapshot = await run((adapter) => adapter.load());
  if (snapshot === null) return null;
  return reattachMask(snapshot, await run((adapter) => adapter.loadMask()));
}

function errorName(error: unknown): string {
  return error instanceof Error && error.name !== '' ? error.name : 'UnknownStorageError';
}
