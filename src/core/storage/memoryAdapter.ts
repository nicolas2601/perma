import type { AnalysisMask, ExamStorageAdapter, StoredExam } from './types';

/** Volatile fallback. Used when IndexedDB is unavailable or fails at runtime. */
export function createMemoryAdapter(): ExamStorageAdapter {
  let snapshot: StoredExam | null = null;
  let mask: AnalysisMask | null = null;
  return {
    async load() {
      return snapshot;
    },
    async save(next) {
      snapshot = next;
    },
    async clear() {
      snapshot = null;
      mask = null;
    },
    async saveMask(next) {
      mask = next;
    },
    async loadMask() {
      return mask;
    },
  };
}
