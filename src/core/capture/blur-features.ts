import { CaptureInputError } from './errors';

export const BLUR_FEATURE_COUNT = 6;
export const BLUR_FEATURE_NAMES = [
  'laplacian-log-energy',
  'fine-log-energy',
  'medium-log-energy',
  'coarse-log-energy',
  'fine-over-medium',
  'medium-over-coarse',
] as const;

const MIN_EDGE = 16;
const MAX_EDGE = 256;

interface Plane {
  readonly values: Float64Array;
  readonly width: number;
  readonly height: number;
}

interface Energy {
  readonly gradient: number;
  readonly laplacian: number;
}

function energyOf(plane: Plane): Energy {
  const { values, width, height } = plane;
  let gradient = 0;
  let laplacian = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const dx = (values[i + 1] ?? 0) - (values[i - 1] ?? 0);
      const dy = (values[i + width] ?? 0) - (values[i - width] ?? 0);
      const lap = (values[i - 1] ?? 0) + (values[i + 1] ?? 0) + (values[i - width] ?? 0) + (values[i + width] ?? 0) - 4 * (values[i] ?? 0);
      gradient += dx * dx + dy * dy;
      laplacian += lap * lap;
      count++;
    }
  }
  return { gradient: gradient / count, laplacian: laplacian / count };
}

/** 2x2 block average; odd trailing rows and columns are dropped. */
function halve(plane: Plane): Plane {
  const width = Math.floor(plane.width / 2);
  const height = Math.floor(plane.height / 2);
  const values = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * 2 * plane.width + x * 2;
      const sum = (plane.values[i] ?? 0) + (plane.values[i + 1] ?? 0)
        + (plane.values[i + plane.width] ?? 0) + (plane.values[i + plane.width + 1] ?? 0);
      values[y * width + x] = sum / 4;
    }
  }
  return { values, width, height };
}

function assertPlane(luma: Float64Array, width: number, height: number): void {
  const validEdge = (edge: number): boolean => Number.isInteger(edge) && edge >= MIN_EDGE && edge <= MAX_EDGE;
  if (!validEdge(width) || !validEdge(height) || luma.length !== width * height) {
    throw new CaptureInputError('invalid-frame', `blur plane ${width}x${height} with ${luma.length} samples`);
  }
}

/**
 * Six multi-scale blur features (log energies and fine/medium ratios) over a luma plane.
 * Self-contained apart from its error type: the training script loads this same module.
 */
export function extractBlurFeatures(luma: Float64Array, width: number, height: number): number[] {
  assertPlane(luma, width, height);
  const base: Plane = { values: luma, width, height };
  let sum = 0;
  let squares = 0;
  for (const value of luma) {
    sum += value;
    squares += value * value;
  }
  const variance = Math.max(1, squares / luma.length - (sum / luma.length) ** 2);
  const fine = energyOf(base);
  const half = halve(base);
  const medium = energyOf(half);
  const quarter = halve(half);
  const coarse = energyOf(quarter);
  return [
    Math.log1p(fine.laplacian / variance),
    Math.log1p(fine.gradient / variance),
    Math.log1p(medium.gradient / variance),
    Math.log1p(coarse.gradient / variance),
    Math.log((fine.gradient + 1) / (medium.gradient + 1)),
    Math.log((medium.gradient + 1) / (coarse.gradient + 1)),
  ];
}
