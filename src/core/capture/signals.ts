import {
  CONTENT_CONTRAST,
  CONTENT_MIN_FRACTION,
  CONTENT_TRIM_HIGH,
  CONTENT_TRIM_LOW,
  MOTION_GRID,
  SPECULAR_LUMA,
} from './constants';
import { medianLuma } from './luma';

export interface ContentRegion {
  /** Larger side of the trimmed content span, as a share of the frame. */
  readonly sizeFraction: number;
  /** Largest distance of the content centre from the frame centre, per axis, as a share of the frame. */
  readonly offset: number;
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

/** Laplacian variance over the interior: low values mean little detail (a smooth or defocused frame). */
export function laplacianVariance(luma: Float64Array, width: number, height: number): number {
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
 * Framing of the content: pixels that differ from the median background, measured by a trimmed span.
 * Heuristic only (not a lesion detector). Returns null when there is no clear content.
 */
export function contentRegion(luma: Float64Array, width: number, height: number): ContentRegion | null {
  const background = medianLuma(luma);
  const columns = new Uint32Array(width);
  const rows = new Uint32Array(height);
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.abs((luma[y * width + x] ?? 0) - background) < CONTENT_CONTRAST) continue;
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

/** Mean luma per cell of a MOTION_GRID x MOTION_GRID grid (block average, remainder dropped). */
export function motionGrid(luma: Float64Array, width: number, height: number): Float64Array {
  const block = Math.floor(width / MOTION_GRID);
  const blockRows = Math.floor(height / MOTION_GRID);
  const grid = new Float64Array(MOTION_GRID * MOTION_GRID);
  const area = block * blockRows;
  for (let gy = 0; gy < MOTION_GRID; gy++) {
    for (let gx = 0; gx < MOTION_GRID; gx++) {
      let sum = 0;
      for (let by = 0; by < blockRows; by++) {
        for (let bx = 0; bx < block; bx++) sum += luma[(gy * blockRows + by) * width + gx * block + bx] ?? 0;
      }
      grid[gy * MOTION_GRID + gx] = sum / area;
    }
  }
  return grid;
}

/** Mean absolute grid difference between two consecutive analyzed frames (luma units). */
export function motionBetween(current: Float64Array, previous: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < current.length; i++) sum += Math.abs((current[i] ?? 0) - (previous[i] ?? 0));
  return sum / current.length;
}
