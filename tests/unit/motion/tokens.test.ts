import { describe, expect, it } from 'vitest';
import { MOTION_MS, PRESS_RANGE_MS, STAGGER_RANGE_MS, msToSeconds } from '../../../src/core/motion/tokens';
import { indicatorSpring, sheetSpring } from '../../../src/core/motion/springs';
import { prefersReducedMotion, reduceFromPreference } from '../../../src/core/motion/reducedMotion';

describe('motion tokens', () => {
  it('keeps the brief numbers', () => {
    expect(MOTION_MS.sheet).toBe(240);
    expect(MOTION_MS.route).toBe(220);
    expect(MOTION_MS.fade).toBe(100);
    expect(MOTION_MS.stagger).toBeGreaterThanOrEqual(STAGGER_RANGE_MS.min);
    expect(MOTION_MS.stagger).toBeLessThanOrEqual(STAGGER_RANGE_MS.max);
    expect(MOTION_MS.press).toBeGreaterThanOrEqual(PRESS_RANGE_MS.min);
    expect(MOTION_MS.press).toBeLessThanOrEqual(PRESS_RANGE_MS.max);
  });

  it('exits are faster than entries', () => {
    expect(MOTION_MS.sheetExit).toBeLessThan(MOTION_MS.sheet);
  });

  it('converts ms to seconds only at the adapter', () => {
    expect(msToSeconds(240)).toBe(0.24);
    expect(msToSeconds(100)).toBe(0.1);
  });
});

describe('springs', () => {
  it('sheetSpring is a bounce-0 spring of 0.24 s', () => {
    expect(sheetSpring).toEqual({ type: 'spring', duration: 0.24, bounce: 0 });
  });

  it('indicatorSpring matches the sheet settle', () => {
    expect(indicatorSpring).toEqual(sheetSpring);
  });
});

describe('reduced motion preference', () => {
  it('reads the media query and treats a missing API as not reduced', () => {
    const reduced = (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' });
    expect(prefersReducedMotion(reduced)).toBe(true);
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
  });

  it('treats an unknown preference (null) as reduced to avoid a first-paint jump', () => {
    expect(reduceFromPreference(null)).toBe(true);
    expect(reduceFromPreference(true)).toBe(true);
    expect(reduceFromPreference(false)).toBe(false);
  });
});
