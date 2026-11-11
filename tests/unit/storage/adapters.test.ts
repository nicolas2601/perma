import type { IDBPDatabase } from 'idb';
import { describe, expect, it, vi } from 'vitest';
import { createExamStorage, UNAVAILABLE_REASON } from '@/core/storage/examStorage';
import {
  createIndexedDbAdapter,
  type ExamDbSchema,
  type OpenExamDatabase,
} from '@/core/storage/indexedDbAdapter';
import { createMemoryAdapter } from '@/core/storage/memoryAdapter';
import { parseStoredExam } from '@/core/storage/schema';
import { EXAM_SCHEMA_VERSION, type ExamStorageAdapter, type StoredExam } from '@/core/storage/types';

function snapshot(note = 'nota'): StoredExam {
  return {
    schemaVersion: EXAM_SCHEMA_VERSION,
    record: {
      id: 'rec-1',
      createdAt: '2026-11-05T12:00:00.000Z',
      bodySite: 'espalda',
      abcde: { A: 'simetrica' },
      note,
      priorImageId: null,
      lastExport: null,
      registryVersion: 2,
    },
    image: {
      original: new Blob([new Uint8Array([1])], { type: 'image/jpeg' }),
      upload: new Blob([new Uint8Array([2])], { type: 'image/jpeg' }),
      name: 'lesion.jpg',
      origin: 'camera',
    },
  };
}

/** Hands the fake database to the adapter where the idb handle type is expected. */
function openWith(db: unknown): OpenExamDatabase {
  return async () => db as IDBPDatabase<ExamDbSchema>;
}

/** Structural fake of the idb database handle: only the calls the adapter makes. */
function fakeDatabase() {
  const store = new Map<string, unknown>();
  const db = {
    get: vi.fn(async (_store: string, key: string) => store.get(key)),
    put: vi.fn(async (_store: string, value: unknown, key: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (_store: string, key: string) => {
      store.delete(key);
    }),
  };
  return { db, store };
}

function failingAdapter(name: string): ExamStorageAdapter {
  const error = Object.assign(new Error('boom'), { name });
  return {
    load: vi.fn(async () => {
      throw error;
    }),
    save: vi.fn(async () => {
      throw error;
    }),
    clear: vi.fn(async () => {
      throw error;
    }),
    saveMask: vi.fn(async () => {
      throw error;
    }),
    loadMask: vi.fn(async () => {
      throw error;
    }),
  };
}

describe('parseStoredExam', () => {
  it('accepts a valid v1 snapshot', () => {
    expect(parseStoredExam(snapshot())).not.toBeNull();
  });

  it('rejects an unknown schema version instead of rendering partial data', () => {
    expect(parseStoredExam({ ...snapshot(), schemaVersion: 99 })).toBeNull();
  });

  it('rejects a corrupt record', () => {
    expect(parseStoredExam({ schemaVersion: 1, record: { id: '' }, image: null })).toBeNull();
  });
});

describe('memory adapter', () => {
  it('round-trips a snapshot and clears it', async () => {
    const adapter = createMemoryAdapter();
    expect(await adapter.load()).toBeNull();
    await adapter.save(snapshot('una'));
    expect((await adapter.load())?.record.note).toBe('una');
    await adapter.clear();
    expect(await adapter.load()).toBeNull();
  });
});

describe('indexedDB adapter (injected database handle)', () => {
  it('saves and loads through the versioned store, validating the payload on read', async () => {
    const { db, store } = fakeDatabase();
    const adapter = createIndexedDbAdapter(openWith(db));
    await adapter.save(snapshot('persistida'));
    expect(store.has('current')).toBe(true);
    expect((await adapter.load())?.record.note).toBe('persistida');
  });

  it('returns null for a payload that fails validation', async () => {
    const { db, store } = fakeDatabase();
    store.set('current', { schemaVersion: 42 });
    const adapter = createIndexedDbAdapter(openWith(db));
    expect(await adapter.load()).toBeNull();
  });

  it('does not cache a failed open, so the next call retries', async () => {
    const { db } = fakeDatabase();
    const open: OpenExamDatabase = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('blocked'), { name: 'InvalidStateError' }))
      .mockResolvedValueOnce(db);
    const adapter = createIndexedDbAdapter(open as OpenExamDatabase);
    await expect(adapter.load()).rejects.toThrow('blocked');
    await expect(adapter.load()).resolves.toBeNull();
    expect(open).toHaveBeenCalledTimes(2);
  });
});

describe('exam storage fallback', () => {
  it('uses memory with a flag when no primary store exists', async () => {
    const storage = createExamStorage(null);
    expect(storage.status()).toEqual({ mode: 'memory', reason: UNAVAILABLE_REASON });
    await storage.save(snapshot('volatil'));
    expect((await storage.load())?.record.note).toBe('volatil');
  });

  it('keeps the primary and reports no reason while it works', async () => {
    const { db } = fakeDatabase();
    const storage = createExamStorage(createIndexedDbAdapter(openWith(db)));
    await storage.save(snapshot());
    expect(storage.status()).toEqual({ mode: 'indexeddb', reason: null });
  });

  it('degrades to memory on the first primary failure and records the error name', async () => {
    const primary = failingAdapter('QuotaExceededError');
    const storage = createExamStorage(primary);
    await storage.save(snapshot('despues-del-fallo'));
    expect(storage.status()).toEqual({ mode: 'memory', reason: 'QuotaExceededError' });
    expect((await storage.load())?.record.note).toBe('despues-del-fallo');
    expect(primary.save).toHaveBeenCalledTimes(1);
    expect(primary.load).not.toHaveBeenCalled();
  });

  it('names a non-Error rejection generically', async () => {
    const primary: ExamStorageAdapter = {
      load: async () => {
        throw 'string failure';
      },
      save: async () => undefined,
      clear: async () => undefined,
      saveMask: async () => undefined,
      loadMask: async () => null,
    };
    const storage = createExamStorage(primary);
    await storage.load();
    expect(storage.status().reason).toBe('UnknownStorageError');
  });
});
