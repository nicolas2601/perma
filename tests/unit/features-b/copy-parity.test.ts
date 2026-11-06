import { describe, expect, it } from 'vitest';
import { copy as abcde } from '@/features/abcde/copy';
import { copy as compare } from '@/features/compare/copy';
import { copy as guide } from '@/features/guide/copy';
import { copy as inspect } from '@/features/inspect/copy';
import { copy as review } from '@/features/review/copy';

/**
 * Feature copy modules must export `copy = { es, en }` with identical keys. The registry
 * enforces this at startup; this test keeps the lane honest without importing the registry.
 */
const FEATURE_COPY = { abcde, compare, guide, inspect, review } as const;

describe('feature copy parity', () => {
  for (const [feature, table] of Object.entries(FEATURE_COPY)) {
    it(`${feature}: ES and EN expose the same keys`, () => {
      expect(Object.keys(table.en).sort()).toEqual(Object.keys(table.es).sort());
    });

    it(`${feature}: no empty values`, () => {
      for (const value of [...Object.values(table.es), ...Object.values(table.en)]) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    });
  }

  it('keeps feature keys clear of the core namespace', () => {
    for (const table of Object.values(FEATURE_COPY)) {
      expect(Object.keys(table.es).some((key) => key.startsWith('core.'))).toBe(false);
    }
  });
});
