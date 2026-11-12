import { describe, expect, it } from 'vitest';
import { canHover, PRESS_HOVER_QUERY, resolvePressFeedback } from '../../../src/core/motion/press';

describe('resolvePressFeedback', () => {
  it('scales to 0.97 in 140 ms for an enabled control', () => {
    const feedback = resolvePressFeedback({ disabled: false, reducedMotion: false });
    expect(feedback.scale).toBe(0.97);
    expect(feedback.durationMs).toBe(140);
    expect(feedback.durationMs).toBeGreaterThanOrEqual(120);
    expect(feedback.durationMs).toBeLessThanOrEqual(160);
  });

  it('never scales a disabled control', () => {
    const feedback = resolvePressFeedback({ disabled: true, reducedMotion: false });
    expect(feedback.scale).toBe(1);
  });

  it('reduced motion swaps the scale for a 100 ms opacity feedback', () => {
    const feedback = resolvePressFeedback({ disabled: false, reducedMotion: true });
    expect(feedback.scale).toBe(1);
    expect(feedback.opacity).toBe(0.85);
    expect(feedback.durationMs).toBe(100);
  });
});

describe('canHover', () => {
  it('gates hover on (hover: hover) and (pointer: fine)', () => {
    const seen: string[] = [];
    const matchMedia = (query: string) => {
      seen.push(query);
      return { matches: true };
    };
    expect(canHover(matchMedia)).toBe(true);
    expect(seen).toEqual([PRESS_HOVER_QUERY]);
    expect(PRESS_HOVER_QUERY).toBe('(hover: hover) and (pointer: fine)');
  });

  it('is false on touch-only devices', () => {
    expect(canHover(() => ({ matches: false }))).toBe(false);
  });
});
