import { describe, expect, it, vi } from 'vitest';
import { planRouteTransition, runRouteTransition } from '../../../src/core/motion/viewTransition';
import { resolveAccordionMotion, accordionRows } from '../../../src/core/motion/accordion';

describe('planRouteTransition', () => {
  it('uses a 220 ms View Transition when the API exists', () => {
    expect(planRouteTransition({ reducedMotion: false, startViewTransition: vi.fn() })).toEqual({
      kind: 'view-transition',
      durationMs: 220,
    });
  });

  it('uses a 100 ms crossfade under reduced motion, still through View Transitions', () => {
    expect(planRouteTransition({ reducedMotion: true, startViewTransition: vi.fn() })).toEqual({
      kind: 'view-transition',
      durationMs: 100,
    });
  });

  it('falls back to a 220 ms Motion fade without the API, and 100 ms when reduced', () => {
    expect(planRouteTransition({ reducedMotion: false })).toEqual({ kind: 'fallback-fade', durationMs: 220 });
    expect(planRouteTransition({ reducedMotion: true })).toEqual({ kind: 'fallback-fade', durationMs: 100 });
  });
});

describe('runRouteTransition', () => {
  it('runs the update exactly once inside startViewTransition', () => {
    const update = vi.fn();
    const startViewTransition = vi.fn((cb: () => void) => cb());
    const plan = runRouteTransition(update, { reducedMotion: false, startViewTransition });
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(plan.durationMs).toBe(220);
  });

  it('runs the update directly when the API is missing, with no double animation', () => {
    const update = vi.fn();
    const plan = runRouteTransition(update, { reducedMotion: false });
    expect(update).toHaveBeenCalledTimes(1);
    expect(plan.kind).toBe('fallback-fade');
  });

  it('under reduced motion still uses the View Transition with a 100 ms plan', () => {
    const startViewTransition = vi.fn();
    const plan = runRouteTransition(() => undefined, { reducedMotion: true, startViewTransition });
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(plan.durationMs).toBe(100);
  });
});

describe('accordion motion', () => {
  it('animates grid-template-rows over 200 ms, or 100 ms reduced', () => {
    expect(resolveAccordionMotion(false)).toEqual({ property: 'grid-template-rows', durationMs: 200 });
    expect(resolveAccordionMotion(true)).toEqual({ property: 'grid-template-rows', durationMs: 100 });
  });

  it('maps open state to 1fr and closed to 0fr', () => {
    expect(accordionRows(true)).toBe('1fr');
    expect(accordionRows(false)).toBe('0fr');
  });
});
