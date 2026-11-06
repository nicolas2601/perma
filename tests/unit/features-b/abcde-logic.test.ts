import { describe, expect, it } from 'vitest';
import { ABCDE_OPTIONS, answeredCount, countOptions, criterionValue, setCriterion } from '@/features/abcde/logic';
import { parseCriterionParam } from '@/features/abcde/criterionParam';
import { emptyRecord } from '@/features/inspect/fakeStore';

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

describe('setCriterion', () => {
  it('records an option and bumps the registry version once per real change', () => {
    const base = emptyRecord('2026-11-05T10:00:00.000Z');
    const next = setCriterion(base, 'B', 'irregular');
    expect(criterionValue(next, 'B')).toBe('irregular');
    expect(next.registryVersion).toBe(base.registryVersion + 1);
  });

  it('is a no-op when the same option is chosen again', () => {
    const base = setCriterion(emptyRecord(), 'A', 'symmetric');
    expect(setCriterion(base, 'A', 'symmetric')).toBe(base);
  });

  it('clears back to unanswered when null is given (absent, never defaulted)', () => {
    const base = setCriterion(emptyRecord(), 'C', 'one-color');
    const cleared = setCriterion(base, 'C', null);
    expect(criterionValue(cleared, 'C')).toBeNull();
    expect('C' in cleared.abcde).toBe(false);
  });

  it('rejects an option that belongs to another criterion', () => {
    expect(() => setCriterion(emptyRecord(), 'A', 'irregular')).toThrow(RangeError);
  });

  it('counts answered criteria without treating unanswered as answered', () => {
    let record = emptyRecord();
    record = setCriterion(record, 'A', 'not-evaluable');
    record = setCriterion(record, 'E', 'no-change-reported');
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
});
