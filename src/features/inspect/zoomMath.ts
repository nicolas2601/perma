export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;
const INERTIA_FRICTION = 0.92;
const INERTIA_MIN_SPEED_PX_MS = 0.02;

export type Pan = { x: number; y: number };
export type Size = { width: number; height: number };

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Double tap toggles between fit (1x) and the working zoom level. */
export function nextDoubleTapScale(current: number): number {
  return current > MIN_SCALE ? MIN_SCALE : DOUBLE_TAP_SCALE;
}

/** Pinch scale from the gesture's start scale and finger distance ratio. */
export function pinchScale(startScale: number, startDistance: number, distance: number): number {
  if (startDistance <= 0) return clampScale(startScale);
  return clampScale((startScale * distance) / startDistance);
}

/** Keeps the scaled image covering the viewport so no empty margin is dragged into view. */
export function clampPan(pan: Pan, scale: number, viewport: Size): Pan {
  const maxX = ((scale - MIN_SCALE) * viewport.width) / 2;
  const maxY = ((scale - MIN_SCALE) * viewport.height) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, pan.x)),
    y: Math.min(maxY, Math.max(-maxY, pan.y)),
  };
}

/** One inertia frame: velocity decays geometrically and stops below a threshold. */
export function inertiaVelocity(velocity: number): number {
  const next = velocity * INERTIA_FRICTION;
  return Math.abs(next) < INERTIA_MIN_SPEED_PX_MS ? 0 : next;
}
