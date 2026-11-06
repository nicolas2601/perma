import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { InertiaZoom } from '@/motion';
import { IDENTITY_ZOOM, type Point } from '@/core/motion';

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 24;
const DOUBLE_TAP_SCALE = 2.5;
const MS_PER_SECOND = 1000;
const MIN_DT_MS = 1;

type Sample = { point: Point; time: number };
type Pinch = { scale: number; distance: number };

const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Pointer gestures for the zoom surface, wired to useInertiaZoom: one finger pans (with
 * release velocity for inertia), two fingers pinch around their midpoint, and a double tap
 * toggles between fit and the working zoom. Coordinates are relative to the viewport center.
 */
export function useZoomPointers(zoom: InertiaZoom, viewportRef: RefObject<HTMLElement | null>) {
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<Pinch | null>(null);
  const last = useRef<Sample | null>(null);
  const velocity = useRef<Point>({ x: 0, y: 0 });
  const lastTap = useRef<Sample | null>(null);

  const toCenter = (point: Point): Point => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return point;
    return { x: point.x - (rect.left + rect.width / 2), y: point.y - (rect.top + rect.height / 2) };
  };

  const pair = (): [Point, Point] => [...pointers.current.values()] as [Point, Point];

  const handleTap = (point: Point, time: number): void => {
    const prev = lastTap.current;
    lastTap.current = { point, time };
    if (!prev || time - prev.time > DOUBLE_TAP_MS || dist(prev.point, point) > DOUBLE_TAP_PX) return;
    lastTap.current = null;
    if (zoom.scale.get() > IDENTITY_ZOOM.scale) zoom.reset();
    else zoom.pinch(IDENTITY_ZOOM.scale, IDENTITY_ZOOM.scale, DOUBLE_TAP_SCALE, toCenter(point));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (pointers.current.size === 1) {
      handleTap(point, event.timeStamp);
      last.current = { point, time: event.timeStamp };
      velocity.current = { x: 0, y: 0 };
      return;
    }
    const [a, b] = pair();
    pinch.current = { scale: zoom.scale.get(), distance: dist(a, b) };
    last.current = null;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const prev = pointers.current.get(event.pointerId);
    if (!prev) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = pair();
      zoom.pinch(pinch.current.scale, pinch.current.distance, dist(a, b), toCenter(midpoint(a, b)));
      return;
    }
    const sample = last.current ?? { point: prev, time: event.timeStamp };
    const dt = Math.max(MIN_DT_MS, event.timeStamp - sample.time);
    velocity.current = {
      x: ((point.x - sample.point.x) / dt) * MS_PER_SECOND,
      y: ((point.y - sample.point.y) / dt) * MS_PER_SECOND,
    };
    last.current = { point, time: event.timeStamp };
    zoom.pan(point.x - prev.x, point.y - prev.y);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size > 0) {
      pinch.current = null;
      return;
    }
    pinch.current = null;
    if (last.current !== null) zoom.release(velocity.current);
    last.current = null;
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
  };
}
