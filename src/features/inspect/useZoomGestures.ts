import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  clampPan,
  clampScale,
  inertiaVelocity,
  MIN_SCALE,
  nextDoubleTapScale,
  pinchScale,
  type Pan,
  type Size,
} from './zoomMath';

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 24;
const INERTIA_START_PX_MS = 0.2;

type Point = { x: number; y: number };
type View = { scale: number; pan: Pan };
type Gesture = {
  startScale: number;
  startDistance: number;
  startPan: Pan;
  startPoint: Point;
  last: { point: Point; time: number };
  velocity: Point;
};

const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Pointer gestures for the zoom surface: pinch, drag with inertia, and double tap. */
export function useZoomGestures() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [view, setView] = useState<View>({ scale: MIN_SCALE, pan: { x: 0, y: 0 } });
  const viewRef = useRef(view);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ point: Point; time: number } | null>(null);
  const frame = useRef<number | null>(null);

  const commit = useCallback((next: View) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const viewportSize = useCallback((): Size => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }, []);

  const stopInertia = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const runInertia = useCallback(
    (velocity: Point) => {
      const step = (vel: Point) => {
        const nextVel = { x: inertiaVelocity(vel.x), y: inertiaVelocity(vel.y) };
        if (nextVel.x === 0 && nextVel.y === 0) {
          frame.current = null;
          return;
        }
        const { scale, pan } = viewRef.current;
        const moved = clampPan({ x: pan.x + nextVel.x * 16, y: pan.y + nextVel.y * 16 }, scale, viewportSize());
        commit({ scale, pan: moved });
        frame.current = requestAnimationFrame(() => step(nextVel));
      };
      frame.current = requestAnimationFrame(() => step(velocity));
    },
    [commit, viewportSize],
  );

  const startPinch = useCallback(() => {
    const [a, b] = [...pointers.current.values()] as [Point, Point];
    gesture.current = {
      startScale: viewRef.current.scale,
      startDistance: dist(a, b),
      startPan: viewRef.current.pan,
      startPoint: a,
      last: { point: a, time: performance.now() },
      velocity: { x: 0, y: 0 },
    };
  }, []);

  const handleDoubleTap = useCallback(
    (point: Point, time: number) => {
      const prev = lastTap.current;
      lastTap.current = { point, time };
      if (!prev || time - prev.time > DOUBLE_TAP_MS || dist(prev.point, point) > DOUBLE_TAP_PX) return;
      lastTap.current = null;
      const nextScale = nextDoubleTapScale(viewRef.current.scale);
      const pan = nextScale === MIN_SCALE ? { x: 0, y: 0 } : viewRef.current.pan;
      commit({ scale: nextScale, pan: clampPan(pan, nextScale, viewportSize()) });
    },
    [commit, viewportSize],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      stopInertia();
      const point = { x: event.clientX, y: event.clientY };
      pointers.current.set(event.pointerId, point);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      if (pointers.current.size === 2) return startPinch();
      handleDoubleTap(point, event.timeStamp);
      gesture.current = {
        startScale: viewRef.current.scale,
        startDistance: 0,
        startPan: viewRef.current.pan,
        startPoint: point,
        last: { point, time: event.timeStamp },
        velocity: { x: 0, y: 0 },
      };
    },
    [handleDoubleTap, startPinch, stopInertia],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(event.pointerId)) return;
      const point = { x: event.clientX, y: event.clientY };
      pointers.current.set(event.pointerId, point);
      const g = gesture.current;
      if (!g) return;
      if (pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()] as [Point, Point];
        const scale = pinchScale(g.startScale, g.startDistance || dist(a, b), dist(a, b));
        commit({ scale, pan: clampPan(viewRef.current.pan, scale, viewportSize()) });
        return;
      }
      if (viewRef.current.scale <= MIN_SCALE) return;
      const dt = Math.max(1, event.timeStamp - g.last.time);
      g.velocity = { x: (point.x - g.last.point.x) / dt, y: (point.y - g.last.point.y) / dt };
      g.last = { point, time: event.timeStamp };
      const pan = clampPan(
        { x: g.startPan.x + point.x - g.startPoint.x, y: g.startPan.y + point.y - g.startPoint.y },
        viewRef.current.scale,
        viewportSize(),
      );
      commit({ scale: viewRef.current.scale, pan });
    },
    [commit, viewportSize],
  );

  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      pointers.current.delete(event.pointerId);
      const g = gesture.current;
      if (pointers.current.size === 0) {
        gesture.current = null;
        const speed = g ? Math.hypot(g.velocity.x, g.velocity.y) : 0;
        if (!reduce && g && speed > INERTIA_START_PX_MS && viewRef.current.scale > MIN_SCALE) {
          runInertia({ x: g.velocity.x * 16, y: g.velocity.y * 16 });
        }
      } else if (pointers.current.size === 1) {
        const [remaining] = [...pointers.current.values()] as [Point];
        gesture.current = {
          startScale: viewRef.current.scale,
          startDistance: 0,
          startPan: viewRef.current.pan,
          startPoint: remaining,
          last: { point: remaining, time: event.timeStamp },
          velocity: { x: 0, y: 0 },
        };
      }
    },
    [reduce, runInertia],
  );

  const reset = useCallback(() => {
    stopInertia();
    commit({ scale: MIN_SCALE, pan: { x: 0, y: 0 } });
  }, [commit, stopInertia]);

  useEffect(() => stopInertia, [stopInertia]);

  return {
    viewportRef,
    scale: clampScale(view.scale),
    pan: view.pan,
    reset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}
