import type { FramePixels } from '@/core/capture/frame';

export const EDGE = 128;

/** Deterministic PRNG (mulberry32). Fixtures never depend on Math.random. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number): number => Math.min(255, Math.max(0, value));

/** Gray plane with high-frequency texture: stands in for a sharp, detailed scene. */
export function texturedLuma(seed = 7, amplitude = 60): Float64Array {
  const random = rng(seed);
  const out = new Float64Array(EDGE * EDGE);
  const phases = Array.from({ length: 4 }, () => random() * Math.PI * 2);
  for (let y = 0; y < EDGE; y++) {
    for (let x = 0; x < EDGE; x++) {
      const wave = Math.sin(x * 0.9 + (phases[0] ?? 0)) + Math.sin(y * 1.1 + (phases[1] ?? 0))
        + Math.sin((x + y) * 0.7 + (phases[2] ?? 0)) + Math.sin((x - y) * 0.5 + (phases[3] ?? 0));
      out[y * EDGE + x] = clamp(128 + amplitude * (wave / 4) + (random() - 0.5) * 8);
    }
  }
  return out;
}

export function toFrame(luma: Float64Array, width = EDGE, height = EDGE): FramePixels {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const v = Math.round(clamp(luma[i] ?? 0));
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  return { width, height, rgba };
}

/** Separable box blur, applied `passes` times: a cheap, deterministic defocus. */
export function boxBlur(luma: Float64Array, radius: number, passes: number): Float64Array {
  let current = luma;
  for (let p = 0; p < passes; p++) {
    current = blurPass(current, radius, true);
    current = blurPass(current, radius, false);
  }
  return current;
}

function blurPass(src: Float64Array, radius: number, horizontal: boolean): Float64Array {
  const out = new Float64Array(src.length);
  for (let y = 0; y < EDGE; y++) {
    for (let x = 0; x < EDGE; x++) {
      let sum = 0;
      for (let d = -radius; d <= radius; d++) {
        const sx = horizontal ? Math.min(EDGE - 1, Math.max(0, x + d)) : x;
        const sy = horizontal ? y : Math.min(EDGE - 1, Math.max(0, y + d));
        sum += src[sy * EDGE + sx] ?? 0;
      }
      out[y * EDGE + x] = sum / (2 * radius + 1);
    }
  }
  return out;
}

export function shifted(luma: Float64Array, dx: number): Float64Array {
  const out = new Float64Array(luma.length);
  for (let y = 0; y < EDGE; y++) {
    for (let x = 0; x < EDGE; x++) {
      const sx = Math.min(EDGE - 1, Math.max(0, x - dx));
      out[y * EDGE + x] = luma[y * EDGE + sx] ?? 0;
    }
  }
  return out;
}

export const mapLuma = (luma: Float64Array, fn: (v: number, i: number) => number): Float64Array =>
  Float64Array.from(luma, (v, i) => fn(v, i));

/** Uniform background with one soft disc at (cx, cy). */
export function discOnBackground(cx: number, cy: number, radius: number, background = 120, disc = 200): Float64Array {
  const out = new Float64Array(EDGE * EDGE).fill(background);
  for (let y = 0; y < EDGE; y++) {
    for (let x = 0; x < EDGE; x++) {
      if (Math.hypot(x - cx, y - cy) <= radius) out[y * EDGE + x] = disc;
    }
  }
  return out;
}

export const smoothGradient = (): Float64Array => mapLuma(new Float64Array(EDGE * EDGE), (_v, i) => 120 + (((i % EDGE) - EDGE / 2) / EDGE) * 4);

export const checkerboard = (): Float64Array =>
  mapLuma(new Float64Array(EDGE * EDGE), (_v, i) => (((i % EDGE) + Math.floor(i / EDGE)) % 2 === 0 ? 0 : 255));
