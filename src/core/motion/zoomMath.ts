export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export interface ZoomState {
  readonly scale: number;
  /** Translation in px, relative to the viewport center (transform-origin is the center). */
  readonly pan: Point;
}

export const IDENTITY_ZOOM: ZoomState = { scale: ZOOM_MIN, pan: { x: 0, y: 0 } };

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

/** Largest translation that keeps the scaled content covering the viewport edges. */
export function panLimits(scale: number, viewport: Viewport): Point {
  const s = clampScale(scale);
  return { x: (viewport.width * (s - ZOOM_MIN)) / 2, y: (viewport.height * (s - ZOOM_MIN)) / 2 };
}

/** `+ 0` turns a -0 produced by Math.max(-0, ...) into +0. */
const clampAxis = (value: number, limit: number): number => Math.min(limit, Math.max(-limit, value)) + 0;

export function clampPan(pan: Point, scale: number, viewport: Viewport): Point {
  const limit = panLimits(scale, viewport);
  return { x: clampAxis(pan.x, limit.x), y: clampAxis(pan.y, limit.y) };
}

/**
 * Zooms to nextScale while keeping the focal point (relative to the center) under the same content.
 * Derivation: content point q = (focal - pan) / scale stays fixed, so pan' = focal - nextScale * q.
 */
export function zoomAroundPoint(state: ZoomState, nextScale: number, focal: Point, viewport: Viewport): ZoomState {
  const scale = clampScale(nextScale);
  const ratio = scale / state.scale;
  const pan = {
    x: focal.x - (focal.x - state.pan.x) * ratio,
    y: focal.y - (focal.y - state.pan.y) * ratio,
  };
  return { scale, pan: clampPan(pan, scale, viewport) };
}

export function pinchScale(startScale: number, startDistance: number, currentDistance: number): number {
  if (startDistance <= 0) return clampScale(startScale);
  return clampScale(startScale * (currentDistance / startDistance));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
