// Deterministic synthetic capture battery for on-device capture advice.
// Pure JS, no network, no patient or skin imagery. Scenes are procedural
// (sinusoidal texture + gaussian blobs) and use their own seed, independent
// from the reference training seed (73129). Labels are synthetic only.

export const BATTERY_SEED = 20261105
export const DEFAULT_EDGE = 128
export const DEFAULT_SCENES = 30
const LUMA_MID = 128
const LUMA_MAX = 255
const WAVES = 3
const BLOBS = 6
const CATEGORY_STRIDE = 1009
const SCENE_STRIDE = 7919

// expect: advice a correct capture-assist should give for the frame.
// params: one value per severity level (see render()).
export const SPEC = [
  { name: 'sharp', expect: 'center', params: [0, 0, 0] },
  { name: 'dim-visible', expect: 'center', params: [0.25, 0.3, 0.35] },
  { name: 'defocus', expect: 'detail', params: [1.2, 2, 3] },
  { name: 'motion', expect: 'detail', params: [5, 9, 13] },
  { name: 'dark', expect: 'dark', params: [0.02, 0.04, 0.06] },
  { name: 'glare-global', expect: 'glare', params: [2.5, 3, 3.5] },
  { name: 'glare-local', expect: 'glare', params: [0.2, 0.25, 0.3] },
  { name: 'flat', expect: 'detail', params: [2, 4, 6] },
]

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

function baseScene(rng, edge) {
  const waves = Array.from({ length: WAVES }, () => {
    const angle = rng() * Math.PI * 2
    // Pixel-scale texture: the low-detail rule is a 4-neighbour Laplacian, so low frequencies read as flat.
    const freq = 0.8 + rng() * 1.4
    return { kx: freq * Math.cos(angle), ky: freq * Math.sin(angle), phase: rng() * Math.PI * 2, amp: 12 + rng() * 10 }
  })
  const blobs = Array.from({ length: BLOBS }, () => ({
    cx: rng() * edge, cy: rng() * edge, sigma: edge * (0.05 + rng() * 0.1), amp: (rng() < 0.5 ? -1 : 1) * (40 + rng() * 40),
  }))
  const values = new Float32Array(edge * edge)
  for (let y = 0; y < edge; y++) for (let x = 0; x < edge; x++) {
    let v = LUMA_MID
    for (const w of waves) v += w.amp * Math.sin(w.kx * x + w.ky * y + w.phase)
    for (const b of blobs) v += b.amp * Math.exp(-((x - b.cx) ** 2 + (y - b.cy) ** 2) / (2 * b.sigma * b.sigma))
    values[y * edge + x] = clamp(v, 0, LUMA_MAX)
  }
  return values
}

function gaussianBlur(values, edge, sigma) {
  const radius = Math.ceil(sigma * 3)
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)))
  const total = kernel.reduce((sum, w) => sum + w, 0)
  const pass = (src, horizontal) => {
    const out = new Float32Array(src.length)
    for (let y = 0; y < edge; y++) for (let x = 0; x < edge; x++) {
      let sum = 0
      for (let d = -radius; d <= radius; d++) {
        const sx = horizontal ? clamp(x + d, 0, edge - 1) : x
        const sy = horizontal ? y : clamp(y + d, 0, edge - 1)
        sum += src[sy * edge + sx] * kernel[d + radius]
      }
      out[y * edge + x] = sum / total
    }
    return out
  }
  return pass(pass(values, true), false)
}

function motionBlur(values, edge, length) {
  const out = new Float32Array(values.length)
  const half = Math.floor(length / 2)
  for (let y = 0; y < edge; y++) for (let x = 0; x < edge; x++) {
    let sum = 0
    for (let d = -half; d <= half; d++) sum += values[y * edge + clamp(x + d, 0, edge - 1)]
    out[y * edge + x] = sum / (half * 2 + 1)
  }
  return out
}

function glareLocal(values, edge, radiusFraction, rng) {
  const out = Float32Array.from(values)
  const radius = edge * radiusFraction
  const cx = edge * (0.3 + rng() * 0.4)
  const cy = edge * (0.3 + rng() * 0.4)
  for (let y = 0; y < edge; y++) for (let x = 0; x < edge; x++) {
    const d = Math.hypot(x - cx, y - cy)
    const mix = clamp(radius + 1 - d, 0, 1)
    out[y * edge + x] = values[y * edge + x] * (1 - mix) + LUMA_MAX * mix
  }
  return out
}

function flatGradient(edge, amplitude, rng) {
  const angle = rng() * Math.PI * 2
  const out = new Float32Array(edge * edge)
  for (let y = 0; y < edge; y++) for (let x = 0; x < edge; x++) {
    const t = ((x - edge / 2) * Math.cos(angle) + (y - edge / 2) * Math.sin(angle)) / edge
    out[y * edge + x] = LUMA_MID + amplitude * t
  }
  return out
}

function applyLevel(category, base, param, edge, rng) {
  switch (category) {
    case 'sharp': return base
    case 'dim-visible': return base.map(v => v * param)
    case 'defocus': return gaussianBlur(base, edge, param)
    case 'motion': return motionBlur(base, edge, param)
    case 'dark': return base.map(v => v * param)
    case 'glare-global': return base.map(v => clamp(v * param + 90, 0, LUMA_MAX))
    case 'glare-local': return glareLocal(base, edge, param, rng)
    case 'flat': return flatGradient(edge, param, rng)
    default: throw new RangeError(`Unknown category ${category}`)
  }
}

function toRgba(luma) {
  const rgba = new Uint8ClampedArray(luma.length * 4)
  for (let i = 0; i < luma.length; i++) {
    const v = Math.round(clamp(luma[i], 0, LUMA_MAX))
    rgba[i * 4] = v
    rgba[i * 4 + 1] = v
    rgba[i * 4 + 2] = v
    rgba[i * 4 + 3] = LUMA_MAX
  }
  return rgba
}

// Returns frames: { id, category, expect, scene, level, edge, rgba }.
export function buildBattery({ edge = DEFAULT_EDGE, scenes = DEFAULT_SCENES } = {}) {
  const frames = []
  SPEC.forEach((spec, catIndex) => {
    for (let scene = 0; scene < scenes; scene++) {
      const base = baseScene(mulberry32(BATTERY_SEED + catIndex * CATEGORY_STRIDE + scene * SCENE_STRIDE), edge)
      spec.params.forEach((param, level) => {
        const rng = mulberry32(BATTERY_SEED + catIndex * 31 + scene * 97 + level * 7)
        const luma = applyLevel(spec.name, base, param, edge, rng)
        frames.push({ id: `${spec.name}-s${scene}-l${level}-e${edge}`, category: spec.name, expect: spec.expect, scene, level, edge, rgba: toRgba(luma) })
      })
    }
  })
  return frames
}
