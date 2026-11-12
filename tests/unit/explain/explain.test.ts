import { describe, expect, it } from 'vitest';
import { formatItaDegrees, itaCategoryLabel } from '@/core/explain/ita';
import { contourToSvgPoints, contourViewBox } from '@/core/explain/contourPath';
import { TONE_STEP_KEYS, TONE_STOPS, createToneCache, isToneStop } from '@/core/explain/toneCache';
import { ITA_CATEGORIES } from '@/core/inference/types';

describe('ITA category labels', () => {
  it('maps every backend category to Spanish', () => {
    expect(ITA_CATEGORIES.map((c) => itaCategoryLabel(c, 'es'))).toEqual([
      'Muy clara',
      'Clara',
      'Intermedia',
      'Bronceada',
      'Morena',
      'Oscura',
    ]);
  });

  it('maps every backend category to English', () => {
    expect(ITA_CATEGORIES.map((c) => itaCategoryLabel(c, 'en'))).toEqual([
      'Very light',
      'Light',
      'Intermediate',
      'Tan',
      'Brown',
      'Dark',
    ]);
  });

  it('uses a Spanish decimal comma and an English decimal point', () => {
    expect(formatItaDegrees(42.5, 'es')).toBe('42,5°');
    expect(formatItaDegrees(42.5, 'en')).toBe('42.5°');
  });

  it('keeps one decimal for whole-number ITA values', () => {
    expect(formatItaDegrees(40, 'es')).toBe('40,0°');
  });

  it('rejects a non-finite ITA instead of printing it', () => {
    expect(() => formatItaDegrees(Number.NaN, 'es')).toThrow(RangeError);
  });
});

describe('contour to SVG polygon', () => {
  const contour = [
    [100, 80],
    [300, 80],
    [300, 260],
  ] as const;

  it('serialises original-pixel points as an SVG points attribute', () => {
    expect(contourToSvgPoints(contour)).toBe('100,80 300,80 300,260');
  });

  it('returns an empty string for an empty contour', () => {
    expect(contourToSvgPoints([])).toBe('');
  });

  it('builds a viewBox equal to the natural image size', () => {
    expect(contourViewBox(1024, 768)).toBe('0 0 1024 768');
  });

  it('rejects non-positive image dimensions', () => {
    expect(() => contourViewBox(0, 768)).toThrow(RangeError);
  });
});

describe('tone stops and simulation cache', () => {
  it('uses one DDI band (4.86 L*) per step, spanning the measured phototype range', () => {
    expect(TONE_STOPS).toEqual([-9.73, -4.86, 0, 4.86, 9.73]);
    expect(TONE_STEP_KEYS).toHaveLength(TONE_STOPS.length);
  });

  it('accepts only stops from the list', () => {
    expect(isToneStop(-4.86)).toBe(true);
    expect(isToneStop(-8)).toBe(false);
  });

  it('stores and retrieves values per delta without collisions', () => {
    const cache = createToneCache<string>();
    cache.set(-4.86, 'a');
    cache.set(4.86, 'b');
    expect(cache.get(-4.86)).toBe('a');
    expect(cache.get(4.86)).toBe('b');
    expect(cache.get(9.73)).toBeUndefined();
  });

  it('clears all entries', () => {
    const cache = createToneCache<string>();
    cache.set(-4.86, 'a');
    cache.clear();
    expect(cache.get(-4.86)).toBeUndefined();
  });

  it('refuses to cache a delta outside the stops', () => {
    const cache = createToneCache<string>();
    expect(() => cache.set(-8 as never, 'x')).toThrow(RangeError);
  });
});

describe('percent format for the lesion area', () => {
  it('uses a locale decimal comma and a space before the percent sign in Spanish', async () => {
    const { formatPercent } = await import('@/core/explain/ita');
    expect(formatPercent(0.428, 'es')).toBe('42,8\u00A0%');
    expect(formatPercent(0.428, 'en')).toBe('42.8%');
  });

  it('refuses a fraction outside [0, 1]', async () => {
    const { formatPercent } = await import('@/core/explain/ita');
    expect(() => formatPercent(1.2, 'es')).toThrow(RangeError);
  });
});
