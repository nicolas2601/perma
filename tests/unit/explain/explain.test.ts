import { describe, expect, it } from 'vitest';
import { formatItaDegrees, itaCategoryLabel } from '@/core/explain/ita';
import { contourToSvgPoints, contourViewBox } from '@/core/explain/contourPath';
import { TONE_STOPS, createToneCache, isToneStop, toneStopLabel } from '@/core/explain/toneCache';
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
  it('exposes exactly the five discrete stops', () => {
    expect(TONE_STOPS).toEqual([-16, -8, 0, 8, 16]);
  });

  it('accepts only stops from the list', () => {
    expect(isToneStop(-8)).toBe(true);
    expect(isToneStop(-4)).toBe(false);
  });

  it('labels a stop with the simulation wording', () => {
    expect(toneStopLabel(-8)).toBe('ΔL* −8 (simulación)');
    expect(toneStopLabel(0)).toBe('ΔL* 0 (simulación)');
  });

  it('stores and retrieves values per delta without collisions', () => {
    const cache = createToneCache<string>();
    cache.set(-8, 'a');
    cache.set(8, 'b');
    expect(cache.get(-8)).toBe('a');
    expect(cache.get(8)).toBe('b');
    expect(cache.get(16)).toBeUndefined();
  });

  it('clears all entries', () => {
    const cache = createToneCache<string>();
    cache.set(-8, 'a');
    cache.clear();
    expect(cache.get(-8)).toBeUndefined();
  });

  it('refuses to cache a delta outside the stops', () => {
    const cache = createToneCache<string>();
    expect(() => cache.set(-4 as never, 'x')).toThrow(RangeError);
  });
});
