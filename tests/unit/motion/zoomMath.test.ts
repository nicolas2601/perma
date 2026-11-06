import { describe, expect, it } from 'vitest';
import {
  IDENTITY_ZOOM,
  ZOOM_MAX,
  ZOOM_MIN,
  clampPan,
  clampScale,
  distance,
  panLimits,
  pinchScale,
  zoomAroundPoint,
} from '../../../src/core/motion/zoomMath';

const VIEWPORT = { width: 100, height: 200 };

describe('clampScale', () => {
  it('keeps the scale between 1 and 4 and rejects non-finite input', () => {
    expect(clampScale(0.2)).toBe(ZOOM_MIN);
    expect(clampScale(9)).toBe(ZOOM_MAX);
    expect(clampScale(2.5)).toBe(2.5);
    expect(clampScale(Number.NaN)).toBe(ZOOM_MIN);
  });
});

describe('panLimits and clampPan', () => {
  it('has no pan room at scale 1', () => {
    expect(panLimits(1, VIEWPORT)).toEqual({ x: 0, y: 0 });
    expect(clampPan({ x: 40, y: -40 }, 1, VIEWPORT)).toEqual({ x: 0, y: 0 });
  });

  it('allows half of the extra scaled size on each side', () => {
    expect(panLimits(2, VIEWPORT)).toEqual({ x: 50, y: 100 });
    expect(clampPan({ x: 80, y: -150 }, 2, VIEWPORT)).toEqual({ x: 50, y: -100 });
  });
});

describe('zoomAroundPoint', () => {
  it('keeps the content under the focal point fixed while zooming', () => {
    const focal = { x: 20, y: 10 };
    const next = zoomAroundPoint(IDENTITY_ZOOM, 2, focal, VIEWPORT);
    const contentBefore = { x: (focal.x - IDENTITY_ZOOM.pan.x) / IDENTITY_ZOOM.scale, y: (focal.y - IDENTITY_ZOOM.pan.y) / IDENTITY_ZOOM.scale };
    const contentAfter = { x: (focal.x - next.pan.x) / next.scale, y: (focal.y - next.pan.y) / next.scale };
    expect(next.scale).toBe(2);
    expect(contentAfter.x).toBeCloseTo(contentBefore.x);
    expect(contentAfter.y).toBeCloseTo(contentBefore.y);
  });

  it('clamps the resulting pan to the viewport limits', () => {
    const next = zoomAroundPoint(IDENTITY_ZOOM, 4, { x: 90, y: 90 }, VIEWPORT);
    const limit = panLimits(4, VIEWPORT);
    expect(Math.abs(next.pan.x)).toBeLessThanOrEqual(limit.x);
    expect(Math.abs(next.pan.y)).toBeLessThanOrEqual(limit.y);
  });
});

describe('pinchScale and distance', () => {
  it('scales proportionally to the finger distance', () => {
    expect(pinchScale(1, 100, 200)).toBe(2);
    expect(pinchScale(2, 100, 50)).toBe(1);
  });

  it('returns the start scale when the start distance is zero', () => {
    expect(pinchScale(2, 0, 50)).toBe(2);
  });

  it('measures the Euclidean distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
