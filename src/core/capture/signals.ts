import {
  CONTENT_MIN_FRACTION,
  CONTENT_RELATIVE,
  CONTENT_TRIM_HIGH,
  CONTENT_TRIM_LOW,
  MIN_GRADIENT,
  MIN_LUMA_VARIANCE,
  MOTION_GRID,
  SPECULAR_LUMA,
} from './constants';
import { medianLuma } from './luma';

export interface ContentRegion {
  /** Larger side of the trimmed content span, as a share of the crop. */
  readonly sizeFraction: number;
  /** Largest distance of the content centre from the crop centre, per axis, as a share of the crop. */
  readonly offset: number;
}

/** Zero-mean, gain-invariant grid of the frame, with the mean neighbour difference used to normalise motion. */
export interface RelativeGrid {
  readonly values: Float64Array;
  readonly gradient: number;
}

interface FloodState {
  readonly luma: Float64Array;
  readonly visited: Uint8Array;
  readonly stack: Int32Array;
  top: number;
}

function pushIfSaturated(state: FloodState, candidate: number): void {
  if (state.visited[candidate] || (state.luma[candidate] ?? 0) < SPECULAR_LUMA) return;
  state.visited[candidate] = 1;
  state.stack[state.top++] = candidate;
}

/** Visits one connected saturated region with an explicit stack; returns its pixel count. */
function regionSize(state: FloodState, width: number, height: number, start: number): number {
  let size = 0;
  state.visited[start] = 1;
  state.stack[state.top++] = start;
  while (state.top > 0) {
    const index = state.stack[--state.top] ?? 0;
    size++;
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) pushIfSaturated(state, index - 1);
    if (x < width - 1) pushIfSaturated(state, index + 1);
    if (y > 0) pushIfSaturated(state, index - width);
    if (y < height - 1) pushIfSaturated(state, index + width);
  }
  return size;
}

/** Share of the frame covered by the largest connected saturated region (local specular glare). */
export function largestSpecularFraction(luma: Float64Array, width: number, height: number): number {
  const total = width * height;
  const state: FloodState = { luma, visited: new Uint8Array(total), stack: new Int32Array(total), top: 0 };
  let best = 0;
  for (let start = 0; start < total; start++) {
    if (state.visited[start] || (luma[start] ?? 0) < SPECULAR_LUMA) continue;
    best = Math.max(best, regionSize(state, width, height, start));
  }
  return best / total;
}

/** Laplacian variance over the interior: a sharp frame has large second differences. */
function laplacianVariance(luma: Float64Array, width: number, height: number): number {
  let sum = 0;
  let squares = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = (luma[i - 1] ?? 0) + (luma[i + 1] ?? 0) + (luma[i - width] ?? 0) + (luma[i + width] ?? 0) - 4 * (luma[i] ?? 0);
      sum += lap;
      squares += lap * lap;
      count++;
    }
  }
  return squares / count - (sum / count) ** 2;
}

function lumaVariance(luma: Float64Array): number {
  let sum = 0;
  let squares = 0;
  for (const value of luma) {
    sum += value;
    squares += value * value;
  }
  return squares / luma.length - (sum / luma.length) ** 2;
}

/**
 * Focus as detail relative to scene contrast: Laplacian variance divided by luma variance. Both scale with
 * the square of the exposure gain, so dimming or brightening does not move the ratio. Null for flat frames.
 */
export function focusRatio(luma: Float64Array, width: number, height: number): number | null {
  const variance = lumaVariance(luma);
  if (variance < MIN_LUMA_VARIANCE) return null;
  return laplacianVariance(luma, width, height) / variance;
}

/** Index where the cumulative count first reaches `target`; used for trimmed spans. */
function firstReaching(histogram: Uint32Array, target: number): number {
  let cumulative = 0;
  for (let i = 0; i < histogram.length; i++) {
    cumulative += histogram[i] ?? 0;
    if (cumulative >= target) return i;
  }
  return histogram.length - 1;
}

function trimmedSpan(histogram: Uint32Array, total: number): { start: number; end: number } {
  return {
    start: firstReaching(histogram, total * CONTENT_TRIM_LOW),
    end: firstReaching(histogram, total * CONTENT_TRIM_HIGH),
  };
}

/**
 * Framing of the content: pixels that differ from the median background by a relative amount, measured by a
 * trimmed span. Heuristic only (not a lesion detector). Null when there is no clear content.
 */
export function contentRegion(luma: Float64Array, width: number, height: number): ContentRegion | null {
  const background = Math.max(1, medianLuma(luma));
  const limit = CONTENT_RELATIVE * background;
  const columns = new Uint32Array(width);
  const rows = new Uint32Array(height);
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.abs((luma[y * width + x] ?? 0) - background) <= limit) continue;
      columns[x] = (columns[x] ?? 0) + 1;
      rows[y] = (rows[y] ?? 0) + 1;
      count++;
    }
  }
  if (count < width * height * CONTENT_MIN_FRACTION) return null;
  const x = trimmedSpan(columns, count);
  const y = trimmedSpan(rows, count);
  const spanWidth = (x.end - x.start + 1) / width;
  const spanHeight = (y.end - y.start + 1) / height;
  const centerX = (x.start + x.end + 1) / (2 * width);
  const centerY = (y.start + y.end + 1) / (2 * height);
  return {
    sizeFraction: Math.max(spanWidth, spanHeight),
    offset: Math.max(Math.abs(centerX - 0.5), Math.abs(centerY - 0.5)),
  };
}

/**
 * Relative grid: cell means divided by the frame mean, minus one. A uniform exposure or white-balance change
 * (a gain) leaves it unchanged, so auto-exposure drift is not mistaken for camera motion.
 */
export function relativeGrid(luma: Float64Array, width: number, height: number): RelativeGrid {
  const block = Math.floor(width / MOTION_GRID);
  const blockRows = Math.floor(height / MOTION_GRID);
  const cells = new Float64Array(MOTION_GRID * MOTION_GRID);
  const area = block * blockRows;
  for (let gy = 0; gy < MOTION_GRID; gy++) {
    for (let gx = 0; gx < MOTION_GRID; gx++) {
      let sum = 0;
      for (let by = 0; by < blockRows; by++) {
        for (let bx = 0; bx < block; bx++) sum += luma[(gy * blockRows + by) * width + gx * block + bx] ?? 0;
      }
      cells[gy * MOTION_GRID + gx] = sum / area;
    }
  }
  let mean = 0;
  for (const value of cells) mean += value;
  mean = Math.max(1, mean / cells.length);
  const values = cells.map(value => value / mean - 1);
  return { values, gradient: meanNeighbourDifference(values) };
}

function meanNeighbourDifference(values: Float64Array): number {
  let sum = 0;
  let count = 0;
  for (let y = 0; y < MOTION_GRID; y++) {
    for (let x = 0; x < MOTION_GRID; x++) {
      const i = y * MOTION_GRID + x;
      if (x < MOTION_GRID - 1) {
        sum += Math.abs((values[i + 1] ?? 0) - (values[i] ?? 0));
        count++;
      }
      if (y < MOTION_GRID - 1) {
        sum += Math.abs((values[i + MOTION_GRID] ?? 0) - (values[i] ?? 0));
        count++;
      }
    }
  }
  return sum / count;
}

/**
 * Camera shift between two analysed frames, in grid cells, normalised by the structure of the current frame.
 * Mean absolute change of the relative grid divided by its mean neighbour difference: a translation scales
 * with the frame's own detail, so a soft or dark frame needs a larger shift to read the same. Null when the
 * frame has too little structure to measure.
 */
export function shiftCells(current: RelativeGrid, previous: Float64Array): number | null {
  if (current.gradient < MIN_GRADIENT) return null;
  let sum = 0;
  for (let i = 0; i < current.values.length; i++) sum += Math.abs((current.values[i] ?? 0) - (previous[i] ?? 0));
  return sum / current.values.length / current.gradient;
}
