import { describe, expect, it } from 'vitest';
import { parseStoredExam } from '@/core/storage/schema';
import { CLINICAL_HISTORY_MAX, EXAM_SCHEMA_VERSION } from '@/core/storage/types';

function storedWith(clinicalContext: unknown): unknown {
  return {
    schemaVersion: EXAM_SCHEMA_VERSION,
    image: null,
    record: {
      id: 'rec-1',
      createdAt: '2026-11-05T12:00:00.000Z',
      bodySite: null,
      abcde: {},
      note: '',
      priorImageId: null,
      lastExport: null,
      registryVersion: 0,
      clinicalContext,
    },
  };
}

describe('parseStoredExam: optional clinical context', () => {
  it('accepts a record without the field (saved before it existed)', () => {
    expect(parseStoredExam(storedWith(undefined))).not.toBeNull();
  });

  it('accepts a complete context and the boundary values', () => {
    const complete = {
      ageYears: 120,
      duration: 'gt6m',
      symptoms: ['itch', 'pain', 'bleeding', 'recentChange'],
      history: 'x'.repeat(CLINICAL_HISTORY_MAX),
    };
    expect(parseStoredExam(storedWith(complete))).not.toBeNull();
    expect(parseStoredExam(storedWith({ ageYears: 0 }))).not.toBeNull();
    expect(parseStoredExam(storedWith({}))).not.toBeNull();
  });

  it.each([
    ['age above 120', { ageYears: 121 }],
    ['age not an integer', { ageYears: 54.5 }],
    ['negative age', { ageYears: -1 }],
    ['age as text', { ageYears: '54' }],
    ['unknown duration', { duration: 'forever' }],
    ['unknown symptom', { symptoms: ['fever'] }],
    ['duplicated symptom', { symptoms: ['itch', 'itch'] }],
    ['symptoms not a list', { symptoms: 'itch' }],
    ['history over 500 characters', { history: 'x'.repeat(CLINICAL_HISTORY_MAX + 1) }],
    ['history not text', { history: 12 }],
    ['context not an object', 'pain'],
    ['context null', null],
  ])('rejects the whole payload when %s', (_label, clinicalContext) => {
    expect(parseStoredExam(storedWith(clinicalContext))).toBeNull();
  });
});
