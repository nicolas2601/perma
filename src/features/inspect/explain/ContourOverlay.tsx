import type { ContourPoint, InferenceResult } from '@/core/inference/types';
import { contourToSvgPoints, contourViewBox } from '@/core/explain/contourPath';
import { useContourLayer } from './contourLayer';

type ContourOverlayProps = {
  contour: readonly ContourPoint[];
  imageWidth: number;
  imageHeight: number;
};

/**
 * Model contour drawn above the unaltered image. viewBox = natural image size and `meet` letterboxing,
 * so it lines up with object-contain. The double stroke (white halo under wine) stays 1-3 px at any zoom.
 */
export function ContourOverlay({ contour, imageWidth, imageHeight }: ContourOverlayProps) {
  const points = contourToSvgPoints(contour);
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={contourViewBox(imageWidth, imageHeight)}
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon
        points={points}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.9}
        strokeWidth={3}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={points}
        fill="none"
        className="stroke-overlay-wine"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Renders the contour only when the layer is on AND the live segmentation is valid. */
export function ContourLayer({ result }: { result: InferenceResult }) {
  const enabled = useContourLayer((state) => state.enabled);
  const segmentation = result.segmentation;
  if (!enabled || segmentation?.status !== 'ok') return null;
  return (
    <ContourOverlay
      contour={segmentation.contour}
      imageWidth={segmentation.imageWidth}
      imageHeight={segmentation.imageHeight}
    />
  );
}
