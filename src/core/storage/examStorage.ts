import { createMemoryAdapter } from './memoryAdapter';
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
    load: () => run((adapter) => adapter.load()),
    save: (snapshot: StoredExam) => run((adapter) => adapter.save(snapshot)),
    clear: () => run((adapter) => adapter.clear()),
  };
}

function errorName(error: unknown): string {
  return error instanceof Error && error.name !== '' ? error.name : 'UnknownStorageError';
}
