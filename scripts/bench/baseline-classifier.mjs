// Pure-JS port of the baseline capture advisor from feature/camera-ml-motion
// (cameraQuality.ts + cameraBlurFeatures.ts + cameraBlurModel.ts + worker decision).
// Ported 1:1 for measurement; the TypeScript source is the reference.

export const BLUR_FEATURE_COUNT = 6
const DARK_LUMA = 10
const GLARE_LUMA = 245
const EXTREME_FRACTION = 0.9
const LOW_DETAIL_VARIANCE = 8
const MIN_EDGE = 16
const MAX_EDGE_BLUR = 256
const MIN_PREVIEW_EDGE = 3
const MAX_PREVIEW_EDGE = 256

function lumaOf(rgba, count) {
  const luma = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const o = i * 4
    luma[i] = rgba[o] * 0.2126 + rgba[o + 1] * 0.7152 + rgba[o + 2] * 0.0722
  }
  return luma
}

// Counts on the float64 luma (same order as the reference); Float32 storage can flip boundary comparisons.
function exposureCounts(rgba, count) {
  let dark = 0
  let glare = 0
  for (let i = 0; i < count; i++) {
    const o = i * 4
    const value = rgba[o] * 0.2126 + rgba[o + 1] * 0.7152 + rgba[o + 2] * 0.0722
    if (value < DARK_LUMA) dark++
    if (value > GLARE_LUMA) glare++
  }
  return { dark, glare }
}

// cameraQuality.ts assessPreview: dark / glare (global only) / low-detail (Laplacian variance).
export function assessPreview(rgba, width, height) {
  const validEdge = (e) => Number.isInteger(e) && e >= MIN_PREVIEW_EDGE && e <= MAX_PREVIEW_EDGE
  if (![width, height].every(validEdge) || rgba.length !== width * height * 4) throw new RangeError('Invalid preview sample')
  const pixels = width * height
  const { dark, glare } = exposureCounts(rgba, pixels)
  if (dark / pixels > EXTREME_FRACTION) return 'dark'
  if (glare / pixels > EXTREME_FRACTION) return 'glare'
  const luma = lumaOf(rgba, pixels)
  let sum = 0
  let squares = 0
  const count = (width - 2) * (height - 2)
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x
    const detail = luma[i - 1] + luma[i + 1] + luma[i - width] + luma[i + width] - 4 * luma[i]
    sum += detail
    squares += detail * detail
  }
  return squares / count - (sum / count) ** 2 < LOW_DETAIL_VARIANCE ? 'detail' : 'center'
}

function energy(values, width, height) {
  let gradient = 0
  let laplacian = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x
    gradient += (values[i + 1] - values[i - 1]) ** 2 + (values[i + width] - values[i - width]) ** 2
    laplacian += (values[i - 1] + values[i + 1] + values[i - width] + values[i + width] - 4 * values[i]) ** 2
    count++
  }
  return [gradient / count, laplacian / count]
}

function downsample(values, width, height) {
  const w = Math.floor(width / 2)
  const h = Math.floor(height / 2)
  const result = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * 2 * width + x * 2
    result[y * w + x] = (values[i] + values[i + 1] + values[i + width] + values[i + width + 1]) / 4
  }
  return { values: result, width: w, height: h }
}

// cameraBlurFeatures.ts extractBlurFeatures: six multi-scale log energies.
export function extractBlurFeatures(rgba, width, height) {
  const validEdge = (e) => Number.isInteger(e) && e >= MIN_EDGE && e <= MAX_EDGE_BLUR
  if (![width, height].every(validEdge) || rgba.length !== width * height * 4) throw new RangeError('Invalid blur sample')
  const values = lumaOf(rgba, width * height)
  let sum = 0
  let squares = 0
  for (const value of values) {
    sum += value
    squares += value * value
  }
  const variance = Math.max(1, squares / values.length - (sum / values.length) ** 2)
  const [fine, laplacian] = energy(values, width, height)
  const half = downsample(values, width, height)
  const [medium] = energy(half.values, half.width, half.height)
  const quarter = downsample(half.values, half.width, half.height)
  const [coarse] = energy(quarter.values, quarter.width, quarter.height)
  return [Math.log1p(laplacian / variance), Math.log1p(fine / variance),
    Math.log1p(medium / variance), Math.log1p(coarse / variance),
    Math.log((fine + 1) / (medium + 1)), Math.log((medium + 1) / (coarse + 1))]
}

const isVector = (value) => Array.isArray(value) && value.length === BLUR_FEATURE_COUNT && value.every(Number.isFinite)

// cameraBlurModel.ts createBlurPredictor. Returns { predict(features) -> { warn, abstained } }.
export function createBlurPredictor(model) {
  if (model.version !== 1 || model.features !== BLUR_FEATURE_COUNT || model.scope !== 'synthetic-blur-only'
    || !isVector(model.mean) || !isVector(model.scale) || !isVector(model.min) || !isVector(model.max)
    || !isVector(model.weights) || !Number.isFinite(model.bias) || !Number.isFinite(model.threshold)
    || model.threshold <= 0 || model.threshold >= 1) throw new TypeError('Invalid local blur model')
  const { mean, scale, min, max, weights, bias, threshold } = model
  return {
    predict(features) {
      // Training-range abstention only; not a validated OOD detector.
      if (features.some((value, i) => value < min[i] || value > max[i])) return { warn: false, abstained: true }
      const logit = features.reduce((sum, value, i) => sum + (value - mean[i]) / scale[i] * weights[i], bias)
      return { warn: 1 / (1 + Math.exp(-logit)) >= threshold, abstained: false }
    },
  }
}

// Worker decision (cameraQuality.worker.ts): exposure/flat first, then blur LR on 'center'.
export function baselineAdvice(rgba, width, height, predictor) {
  const exposureOrDetail = assessPreview(rgba, width, height)
  if (exposureOrDetail !== 'center') return { advice: exposureOrDetail, abstained: false }
  const { warn, abstained } = predictor.predict(extractBlurFeatures(rgba, width, height))
  return { advice: warn ? 'detail' : 'center', abstained }
}

// Pure-CV arm: only the deterministic rules (dark, global glare, low detail). No blur model.
export function pureCvAdvice(rgba, width, height) {
  return { advice: assessPreview(rgba, width, height), abstained: false }
}
