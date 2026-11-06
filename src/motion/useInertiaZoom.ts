import { animate, useMotionValue, type MotionValue } from 'motion/react';
import {
  IDENTITY_ZOOM,
  MOTION_MS,
  clampPan,
  msToSeconds,
  panLimits,
  pinchScale,
  zoomAroundPoint,
  type Point,
  type Viewport,
  EASE_OUT,
} from '../core/motion';

export interface InertiaZoomOptions {
  readonly viewport: Viewport;
  readonly reducedMotion: boolean;
}

export interface InertiaZoom {
  readonly scale: MotionValue<number>;
  readonly x: MotionValue<number>;
  readonly y: MotionValue<number>;
  /** Live gesture update: no animation while the fingers move. */
  readonly pinch: (startScale: number, startDistance: number, currentDistance: number, focal: Point) => void;
  readonly pan: (dx: number, dy: number) => void;
  /** Gesture end: decelerate with Motion inertia, clamped to the pan limits. Reduced: settle in 100 ms, no inertia. */
  readonly release: (velocity: Point) => void;
  readonly reset: () => void;
}

/**
 * Transform-only pan and pinch zoom for the viewer, with inertia on release.
 * The math lives in core/motion/zoomMath.ts and is unit-tested there; this hook only wires motion values.
 */
export function useInertiaZoom({ viewport, reducedMotion }: InertiaZoomOptions): InertiaZoom {
  const scale = useMotionValue(IDENTITY_ZOOM.scale);
  const x = useMotionValue(IDENTITY_ZOOM.pan.x);
  const y = useMotionValue(IDENTITY_ZOOM.pan.y);

  const writePan = (pan: Point) => {
    x.set(pan.x);
    y.set(pan.y);
  };

  const pinch: InertiaZoom['pinch'] = (startScale, startDistance, currentDistance, focal) => {
    const next = zoomAroundPoint(
      { scale: scale.get(), pan: { x: x.get(), y: y.get() } },
      pinchScale(startScale, startDistance, currentDistance),
      focal,
      viewport,
    );
    scale.set(next.scale);
    writePan(next.pan);
  };

  const pan: InertiaZoom['pan'] = (dx, dy) => {
    writePan(clampPan({ x: x.get() + dx, y: y.get() + dy }, scale.get(), viewport));
  };

  const release: InertiaZoom['release'] = (velocity) => {
    const limit = panLimits(scale.get(), viewport);
    if (reducedMotion) {
      const settled = clampPan({ x: x.get(), y: y.get() }, scale.get(), viewport);
      const settle = { duration: msToSeconds(MOTION_MS.fade), ease: EASE_OUT };
      animate(x, settled.x, settle);
      animate(y, settled.y, settle);
      return;
    }
    animate(x, x.get(), { type: 'inertia', velocity: velocity.x, min: -limit.x, max: limit.x });
    animate(y, y.get(), { type: 'inertia', velocity: velocity.y, min: -limit.y, max: limit.y });
  };

  const reset = () => {
    scale.set(IDENTITY_ZOOM.scale);
    writePan(IDENTITY_ZOOM.pan);
  };

  return { scale, x, y, pinch, pan, release, reset };
}
