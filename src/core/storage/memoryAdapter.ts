import type { ExamStorageAdapter, StoredExam } from './types';

/** Volatile fallback. Used when IndexedDB is unavailable or fails at runtime. */
export function createMemoryAdapter(): ExamStorageAdapter {
  let snapshot: StoredExam | null = null;
  return {
    async load() {
      return snapshot;
    },
    async save(next) {
      snapshot = next;
    },
    async clear() {
      snapshot = null;
    },
  };
}
