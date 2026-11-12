import { describe, expect, it } from 'vitest';
import { createEmptyRecord } from '@/core/exam/state';
import { ABCDE_OPTIONS, answeredCount, countOptions, criterionValue } from '@/features/abcde/logic';
import { parseCriterionParam, rowId } from '@/features/abcde/criterionParam';
import { fixedClock } from '../exam/fixtures';

describe('ABCDE options', () => {
  it('exposes exactly 17 options across the five criteria', () => {
    expect(countOptions()).toBe(17);
  });

  it('keeps option ids unique within each criterion', () => {
    for (const values of Object.values(ABCDE_OPTIONS)) {
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

describe('record reads', () => {
  it('reads an answer and counts answered criteria without treating unanswered as answered', () => {
    const record = {
      ...createEmptyRecord(fixedClock()),
      abcde: { A: 'not-evaluable', E: 'no-change-reported' },
    };
    expect(criterionValue(record, 'A')).toBe('not-evaluable');
    expect(criterionValue(record, 'B')).toBeNull();
    expect(answeredCount(record)).toBe(2);
  });
});

describe('edge parsing', () => {
  it('accepts ?criterio=a..e case-insensitively and rejects anything else', () => {
    expect(parseCriterionParam('c')).toBe('C');
    expect(parseCriterionParam('E')).toBe('E');
    expect(parseCriterionParam('z')).toBeNull();
    expect(parseCriterionParam(null)).toBeNull();
  });

  it('builds a stable DOM id per criterion', () => {
    expect(rowId('D')).toBe('abcde-d');
  });
});
