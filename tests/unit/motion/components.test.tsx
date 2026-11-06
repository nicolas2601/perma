import { act, render, renderHook } from '@testing-library/react';
import { animate, MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '../../../src/core/motion/MotionProvider';
import { NAV_INDICATOR_LAYOUT_ID, resolveNavIndicatorMode } from '../../../src/motion/NavIndicator';
import { useInertiaZoom } from '../../../src/motion/useInertiaZoom';

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, animate: vi.fn(), MotionConfig: vi.fn(({ children }: { children: ReactNode }) => children) };
});

const VIEWPORT = { width: 100, height: 200 };

describe('MotionProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('wraps the app in MotionConfig with reducedMotion="user"', () => {
    render(
      <MotionProvider>
        <span>child</span>
      </MotionProvider>,
    );
    const props = vi.mocked(MotionConfig).mock.calls[0]?.[0];
    expect(props?.reducedMotion).toBe('user');
  });
});

describe('resolveNavIndicatorMode', () => {
  it('uses the shared layoutId when motion is allowed', () => {
    expect(resolveNavIndicatorMode(false)).toEqual({ kind: 'layout', layoutId: NAV_INDICATOR_LAYOUT_ID });
  });

  it('uses a 100 ms opacity crossfade under reduced motion, never layout projection', () => {
    expect(resolveNavIndicatorMode(true)).toEqual({ kind: 'fade', durationMs: 100 });
  });
});

describe('useInertiaZoom', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pinches to a clamped scale and keeps pan inside the limits', () => {
    const { result } = renderHook(() => useInertiaZoom({ viewport: VIEWPORT, reducedMotion: false }));
    act(() => result.current.pinch(1, 100, 200, { x: 0, y: 0 }));
    expect(result.current.scale.get()).toBe(2);
    act(() => result.current.pan(500, 500));
    expect(result.current.x.get()).toBe(50);
    expect(result.current.y.get()).toBe(100);
  });

  it('releases with Motion inertia bounded by the pan limits', () => {
    const { result } = renderHook(() => useInertiaZoom({ viewport: VIEWPORT, reducedMotion: false }));
    act(() => result.current.pinch(1, 100, 200, { x: 0, y: 0 }));
    act(() => result.current.release({ x: 300, y: -120 }));
    expect(animate).toHaveBeenCalledWith(result.current.x, 0, { type: 'inertia', velocity: 300, min: -50, max: 50 });
    expect(animate).toHaveBeenCalledWith(result.current.y, 0, { type: 'inertia', velocity: -120, min: -100, max: 100 });
  });

  it('reduced motion settles in 100 ms without inertia', () => {
    const { result } = renderHook(() => useInertiaZoom({ viewport: VIEWPORT, reducedMotion: true }));
    act(() => result.current.release({ x: 300, y: 0 }));
    const calls = vi.mocked(animate).mock.calls;
    expect(calls).toHaveLength(2);
    for (const [, , options] of calls) {
      expect(options).toMatchObject({ duration: 0.1 });
      expect(JSON.stringify(options)).not.toContain('inertia');
    }
  });

  it('reset returns to scale 1 and no pan', () => {
    const { result } = renderHook(() => useInertiaZoom({ viewport: VIEWPORT, reducedMotion: false }));
    act(() => result.current.pinch(1, 100, 200, { x: 0, y: 0 }));
    act(() => result.current.reset());
    expect(result.current.scale.get()).toBe(1);
    expect(result.current.x.get()).toBe(0);
  });
});
