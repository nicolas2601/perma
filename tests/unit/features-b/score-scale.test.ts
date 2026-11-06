import { describe, expect, it } from 'vitest';
import { formatRawScore } from '@/ui';
import { toRawScore, InvalidScoreError } from '@/ui/score';
import { rankClasses, CLASS_INFO, isClassCode } from '@/features/inspect/classes';
import { MOCK_SCORES, mockResult } from '@/features/inspect/fakeStore';

describe('raw score scale', () => {
  it('formats decimals in both locales and never as a percentage', () => {
    expect(formatRawScore(0.61, 'es')).toBe('0,61');
    expect(formatRawScore(0.61, 'en')).toBe('0.61');
    expect(formatRawScore(0.5, 'en')).not.toContain('%');
  });

  it('rejects values outside the shared 0-1 scale at the edge', () => {
    expect(() => toRawScore(1.2)).toThrow(InvalidScoreError);
    expect(() => toRawScore(-0.01)).toThrow(InvalidScoreError);
    expect(() => toRawScore(Number.NaN)).toThrow(InvalidScoreError);
    expect(toRawScore(0)).toBe(0);
    expect(toRawScore(1)).toBe(1);
  });

  it('ranks classes from highest to lowest raw score', () => {
    const ranked = rankClasses(MOCK_SCORES);
    expect(ranked[0]).toBe('nv');
    expect(ranked[ranked.length - 1]).toBe('df');
    expect(ranked).toHaveLength(7);
  });

  it('keeps the synthetic mock scores on the 0-1 scale and summing to 1', () => {
    const values = Object.values(mockResult().scores);
    expect(values.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('validates class codes from route params', () => {
    expect(isClassCode('mel')).toBe(true);
    expect(isClassCode('zzz')).toBe(false);
    expect(Object.keys(CLASS_INFO)).toHaveLength(7);
  });
});
