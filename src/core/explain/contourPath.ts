import type { ContourPoint } from '@/core/inference/types';

/** SVG `points` attribute in original-pixel coordinates. The polygon is closed implicitly by SVG. */
export function contourToSvgPoints(contour: readonly ContourPoint[]): string {
  return contour.map(([x, y]) => `${x},${y}`).join(' ');
}

/** viewBox equal to the natural image size, so the overlay scales with the image, not the viewport. */
export function contourViewBox(imageWidth: number, imageHeight: number): string {
  if (!isPositiveFinite(imageWidth) || !isPositiveFinite(imageHeight)) {
    throw new RangeError(`Image size must be positive, received ${imageWidth}x${imageHeight}`);
  }
  return `0 0 ${imageWidth} ${imageHeight}`;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
