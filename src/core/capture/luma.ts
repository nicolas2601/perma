import type { FramePixels } from './frame';

const WEIGHT_RED = 0.2126;
const WEIGHT_GREEN = 0.7152;
const WEIGHT_BLUE = 0.0722;
const CHANNELS = 4;

/** Rec. 709 luma in float64. Counts on float64 avoid Float32 boundary flips at the thresholds. */
export function lumaOf(frame: FramePixels): Float64Array {
  const pixels = frame.width * frame.height;
  const luma = new Float64Array(pixels);
  const rgba = frame.rgba;
  for (let i = 0; i < pixels; i++) {
    const o = i * CHANNELS;
    luma[i] = (rgba[o] ?? 0) * WEIGHT_RED + (rgba[o + 1] ?? 0) * WEIGHT_GREEN + (rgba[o + 2] ?? 0) * WEIGHT_BLUE;
  }
  return luma;
}

/** Median luma, from a 256-bin histogram of rounded values. */
export function medianLuma(luma: Float64Array): number {
  const bins = new Uint32Array(256);
  for (const value of luma) bins[Math.min(255, Math.max(0, Math.round(value)))]!++;
  const half = luma.length / 2;
  let cumulative = 0;
  for (let bin = 0; bin < bins.length; bin++) {
    cumulative += bins[bin] ?? 0;
    if (cumulative >= half) return bin;
  }
  return 255;
}
