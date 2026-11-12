// Procedural training generator for the blur head. Family: fractal value noise + soft elliptical
// "lesion-like" blobs + illumination gradient. It is deliberately NOT the R2 battery family (sinusoids
// and gaussian blobs), so the battery stays an independent holdout. Synthetic only; no patient images.

export const GENERATOR_ID = 'procedural-value-noise-v1';
export const EDGE = 128;
const CHANNELS = 4;
const LEVEL_MAX = 255;
const OCTAVE_CELLS = [24, 12, 6];
const OCTAVE_WEIGHTS = [0.5, 0.3, 0.2];
const ELLIPSES = 3;
const MIN_SIGMA = 1.0;
const MAX_SIGMA = 3.0;
const MOTION_LENGTHS = [5, 7, 9, 11, 13];
const DIRECTIONS = [[1, 0], [0, 1], [1, 1]];
const DIM_RANGE = [0.3, 0.5];
const NOISE_LEVELS = [0, 1, 2];

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smooth = t => t * t * (3 - 2 * t);
const between = (rng, [low, high]) => low + (high - low) * rng();

function valueNoise(rng, cells) {
  const lattice = (cells + 2) * (cells + 2);
  const values = Array.from({ length: lattice }, () => rng());
  const out = new Float64Array(EDGE * EDGE);
  const step = EDGE / cells;
  for (let y = 0; y < EDGE; y++) {
    for (let x = 0; x < EDGE; x++) {
      const gx = x / step;
      const gy = y / step;
      const ix = Math.floor(gx);
      const iy = Math.floor(gy);
      const tx = smooth(gx - ix);
      const ty = smooth(gy - iy);
      const v = (i, j) => values[(iy + j) * (cells + 2) + ix + i] ?? 0;
      const top = v(0, 0) + (v(1, 0) - v(0, 0)) * tx;
      const bottom = v(0, 1) + (v(1, 1) - v(0, 1)) * tx;
      out[y * EDGE + x] = top + (bottom - top) * ty;
    }
  }
  return out;
}

function fractalTexture(rng) {
  const out = new Float64Array(EDGE * EDGE);
  OCTAVE_CELLS.forEach((cells, k) => {
    const layer = valueNoise(rng, cells);
    for (let i = 0; i < out.length; i++) out[i] += (layer[i] ?? 0) * (OCTAVE_WEIGHTS[k] ?? 0);
  });
  return out;
}

function addLesions(luma, rng) {
  for (let k = 0; k < ELLIPSES; k++) {
    const cx = EDGE * (0.2 + 0.6 * rng());
    const cy = EDGE * (0.2 + 0.6 * rng());
    const rx = EDGE * between(rng, [0.08, 0.22]);
    const ry = EDGE * between(rng, [0.08, 0.22]);
    const amp = (rng() < 0.5 ? -1 : 1) * between(rng, [30, 70]);
    for (let y = 0; y < EDGE; y++) {
      for (let x = 0; x < EDGE; x++) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
        luma[y * EDGE + x] += amp * (1 - smooth(clamp(d, 0, 1)));
      }
    }
  }
}

/** Base scene in luma units, before any capture degradation. */
export function baseScene(rng) {
  const texture = fractalTexture(rng);
  const contrast = between(rng, [60, 110]);
  const angle = rng() * Math.PI * 2;
  const slope = between(rng, [10, 35]);
  const luma = new Float64Array(EDGE * EDGE);
  for (let y = 0; y < EDGE; y++) {
    for (let x = 0; x < EDGE; x++) {
      const i = y * EDGE + x;
      const t = ((x - EDGE / 2) * Math.cos(angle) + (y - EDGE / 2) * Math.sin(angle)) / EDGE;
      luma[i] = 128 + (texture[i] - 0.5) * contrast + slope * t;
    }
  }
  addLesions(luma, rng);
  return luma;
}

function gaussianBlur(src, sigma) {
  const radius = Math.ceil(sigma * 3);
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)));
  const total = kernel.reduce((sum, w) => sum + w, 0);
  const pass = (input, horizontal) => {
    const out = new Float64Array(input.length);
    for (let y = 0; y < EDGE; y++) {
      for (let x = 0; x < EDGE; x++) {
        let sum = 0;
        for (let d = -radius; d <= radius; d++) {
          const sx = horizontal ? clamp(x + d, 0, EDGE - 1) : x;
          const sy = horizontal ? y : clamp(y + d, 0, EDGE - 1);
          sum += (input[sy * EDGE + sx] ?? 0) * (kernel[d + radius] ?? 0);
        }
        out[y * EDGE + x] = sum / total;
      }
    }
    return out;
  };
  return pass(pass(src, true), false);
}

function motionBlur(src, length, [dx, dy]) {
  const out = new Float64Array(src.length);
  const half = Math.floor(length / 2);
  for (let y = 0; y < EDGE; y++) {
    for (let x = 0; x < EDGE; x++) {
      let sum = 0;
      for (let t = -half; t <= half; t++) {
        const sx = clamp(Math.round(x + t * dx), 0, EDGE - 1);
        const sy = clamp(Math.round(y + t * dy), 0, EDGE - 1);
        sum += src[sy * EDGE + sx] ?? 0;
      }
      out[y * EDGE + x] = sum / (half * 2 + 1);
    }
  }
  return out;
}

function addNoise(src, sigma, rng) {
  if (sigma === 0) return src;
  return src.map(v => v + sigma * (rng() + rng() + rng() - 1.5) * 2);
}

/** Converts a luma plane to the RGBA layout the app analyzes (gray pixels, opaque). */
export function toRgba(luma) {
  const rgba = new Uint8ClampedArray(luma.length * CHANNELS);
  for (let i = 0; i < luma.length; i++) {
    const v = Math.round(clamp(luma[i] ?? 0, 0, LEVEL_MAX));
    rgba[i * CHANNELS] = v;
    rgba[i * CHANNELS + 1] = v;
    rgba[i * CHANNELS + 2] = v;
    rgba[i * CHANNELS + 3] = LEVEL_MAX;
  }
  return rgba;
}

/**
 * Renders one scene into labelled frames. Labels: 1 = blurred (needs a focus advice), 0 = clean.
 * Clean frames: sharp with light sensor noise, and dimmed (still visible). Blurred: gaussian and motion.
 */
export function renderSceneFrames(seed) {
  const rng = mulberry(seed);
  const base = baseScene(rng);
  const frames = [];
  const push = (kind, label, luma, detail) => frames.push({ kind, label, rgba: toRgba(luma), detail });
  push('sharp', 0, addNoise(base, NOISE_LEVELS[Math.floor(rng() * NOISE_LEVELS.length)] ?? 0, rng), null);
  const dim = between(rng, DIM_RANGE);
  push('dim', 0, base.map(v => v * dim), { scale: dim });
  const sigma = between(rng, [MIN_SIGMA, MAX_SIGMA]);
  push('gaussian', 1, gaussianBlur(base, sigma), { sigma });
  const length = MOTION_LENGTHS[Math.floor(rng() * MOTION_LENGTHS.length)] ?? 5;
  const direction = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)] ?? [1, 0];
  push('motion', 1, motionBlur(base, length, direction), { length, direction });
  return frames;
}
