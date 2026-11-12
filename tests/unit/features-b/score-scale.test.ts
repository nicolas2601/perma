import { describe, expect, it } from 'vitest';
import { formatRawScore } from '@/ui';
import { toRawScore, InvalidScoreError } from '@/ui/score';
import { rankClasses, CLASS_INFO, isClassCode } from '@/features/inspect/classes';
import type { ClassCode } from '@/core/inference/types';

const SCORES: Record<ClassCode, number> = {
  nv: 0.61,
  bkl: 0.15,
  mel: 0.09,
  bcc: 0.06,
  akiec: 0.04,
  vasc: 0.03,
  df: 0.02,
};

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
    const ranked = rankClasses(SCORES);
    expect(ranked[0]).toBe('nv');
    expect(ranked[ranked.length - 1]).toBe('df');
    expect(ranked).toHaveLength(7);
  });

  it('validates class codes from route params', () => {
    expect(isClassCode('mel')).toBe(true);
    expect(isClassCode('zzz')).toBe(false);
    expect(Object.keys(CLASS_INFO)).toHaveLength(7);
  });
});
