import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { parseStoredExam } from './schema';
import { isAnalysisMask } from './maskRecord';
import type { AnalysisMask, ExamStorageAdapter, StoredExam } from './types';

const DB_NAME = 'perma-exam';
/** Bump with a new upgrade branch for every schema change. */
const DB_VERSION = 1;
const STORE = 'exam';
const CURRENT_KEY = 'current';
const MASK_KEY = 'analysisMask';

export interface ExamDbSchema extends DBSchema {
  exam: { key: string; value: unknown };
}

export type OpenExamDatabase = () => Promise<IDBPDatabase<ExamDbSchema>>;

export function openDefaultDatabase(): Promise<IDBPDatabase<ExamDbSchema>> {
  return openDB<ExamDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) db.createObjectStore(STORE);
    },
  });
}

/**
 * IndexedDB adapter. The database handle is opened once and reused; a failed
 * open is not cached, so the next call can retry. The opener is injected so
 * tests can exercise the adapter contract without a real IndexedDB.
 */
export function createIndexedDbAdapter(open: OpenExamDatabase = openDefaultDatabase): ExamStorageAdapter {
  let handle: Promise<IDBPDatabase<ExamDbSchema>> | null = null;
  const database = (): Promise<IDBPDatabase<ExamDbSchema>> => {
    handle ??= open().catch((error: unknown) => {
      handle = null;
      throw error;
    });
    return handle;
  };

  return {
    async load(): Promise<StoredExam | null> {
      const db = await database();
      return parseStoredExam(await db.get(STORE, CURRENT_KEY));
    },
    async save(snapshot) {
      const db = await database();
      await db.put(STORE, snapshot, CURRENT_KEY);
    },
    async clear() {
      const db = await database();
      await db.delete(STORE, CURRENT_KEY);
      await db.delete(STORE, MASK_KEY);
    },
    async saveMask(mask: AnalysisMask | null) {
      const db = await database();
      if (mask === null) await db.delete(STORE, MASK_KEY);
      else await db.put(STORE, mask, MASK_KEY);
    },
    async loadMask() {
      const db = await database();
      const value: unknown = await db.get(STORE, MASK_KEY);
      return isAnalysisMask(value) ? value : null;
    },
  };
}
