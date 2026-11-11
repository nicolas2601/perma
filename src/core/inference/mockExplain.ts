// Simulated explainability. Every value here is SYNTHETIC: source 'mock', never presented as measured.
import { mulberry32 } from './seededRandom';
import type {
  ContourPoint,
  ItaCategory,
  PhotometryResult,
  SegmentationResult,
} from './types';

export const SIMULATED_IMAGE_WIDTH = 1024;
export const SIMULATED_IMAGE_HEIGHT = 768;
const MASK_WIDTH = 512;
const MASK_HEIGHT = 384;
const CONTOUR_POINTS = 64;
const ELLIPSE_RX_RATIO = 0.22;
const ELLIPSE_RY_RATIO = 0.2;
const ELLIPSE_JITTER = 0.06;
const MASK_THRESHOLD = 0.5;
const TWO_PI = Math.PI * 2;
const RAD_TO_DEG = 180 / Math.PI;
const ITA_DECIMALS = 10;
const L_MIN = 45;
const L_SPAN = 30;
const B_MIN = 3;
const B_SPAN = 20;
const B_INDETERMINATE = 5;
const L_MAX = 100;
const L_MIN_CLIP = 0;
const PLACEHOLDER_MASK_PNG = 'iVBORw0KGgo=';
const SIMULATED_IDENTITY = {
  modelId: 'simulated-segmenter',
  run: 'simulated',
  release: 'simulated',
  modelSha256: '0'.repeat(64),
  inputSize: 224,
};
const ITA_THRESHOLDS: ReadonlyArray<readonly [number, ItaCategory]> = [
  [55, 'very_light'],
  [41, 'light'],
  [28, 'intermediate'],
  [10, 'tan'],
  [-30, 'brown'],
];
const ITA_FALLBACK: ItaCategory = 'dark';

/** Chardon 1991 / Del Bino 2006 colorimetric ITA categories (not Fitzpatrick). */
export function itaCategoryFor(ita: number): ItaCategory {
  const match = ITA_THRESHOLDS.find(([min]) => ita > min);
  return match ? match[1] : ITA_FALLBACK;
}

export function itaDegrees(medianL: number, medianB: number): number {
  const degrees = Math.atan2(medianL - 50, medianB) * RAD_TO_DEG;
  return Math.round(degrees * ITA_DECIMALS) / ITA_DECIMALS;
}

function ellipseContour(random: () => number): ContourPoint[] {
  const cx = SIMULATED_IMAGE_WIDTH / 2;
  const cy = SIMULATED_IMAGE_HEIGHT / 2;
  const rx = SIMULATED_IMAGE_WIDTH * ELLIPSE_RX_RATIO;
  const ry = SIMULATED_IMAGE_HEIGHT * ELLIPSE_RY_RATIO;
  return Array.from({ length: CONTOUR_POINTS }, (_, i): ContourPoint => {
    const t = (i / CONTOUR_POINTS) * TWO_PI;
    const jitter = 1 + (random() - 0.5) * ELLIPSE_JITTER;
    const x = Math.round(cx + rx * jitter * Math.cos(t));
    const y = Math.round(cy + ry * jitter * Math.sin(t));
    return [x, y];
  });
}

function simulatedSegmentation(random: () => number): SegmentationResult {
  const contour = ellipseContour(random);
  const areaFraction = Math.round(Math.PI * ELLIPSE_RX_RATIO * ELLIPSE_RY_RATIO * 1000) / 1000;
  return {
    status: 'ok',
    source: 'mock',
    imageWidth: SIMULATED_IMAGE_WIDTH,
    imageHeight: SIMULATED_IMAGE_HEIGHT,
    maskWidth: MASK_WIDTH,
    maskHeight: MASK_HEIGHT,
    maskPngBase64: PLACEHOLDER_MASK_PNG,
    contour,
    areaFraction,
    threshold: MASK_THRESHOLD,
    identity: SIMULATED_IDENTITY,
  };
}

function simulatedPhotometry(random: () => number): PhotometryResult {
  const medianL = Math.round((L_MIN + random() * L_SPAN) * 10) / 10;
  const medianB = Math.round((B_MIN + random() * B_SPAN) * 10) / 10;
  const base = { region: 'perilesional_ring', medianL, medianB, nPx: 5000, validFraction: 0.8 };
  if (medianB < B_INDETERMINATE) {
    return { status: 'indeterminate', ...base, itaDeg: null, itaCategory: null };
  }
  const itaDeg = itaDegrees(medianL, medianB);
  return { status: 'ok', ...base, itaDeg, itaCategory: itaCategoryFor(itaDeg) };
}

/** Deterministic simulated segmentation and photometry for one seed (image bytes hash). */
export function simulatedExplainability(seed: number): {
  segmentation: SegmentationResult;
  photometry: PhotometryResult;
} {
  const random = mulberry32(seed);
  return { segmentation: simulatedSegmentation(random), photometry: simulatedPhotometry(random) };
}

/** Shifts L* only (b* unchanged, as in the backend tone transform), clipped to [0, 100]. */
export function shiftPhotometry(photometry: PhotometryResult, deltaL: number): PhotometryResult {
  if (photometry.status === 'unavailable') return photometry;
  const medianL = Math.min(L_MAX, Math.max(L_MIN_CLIP, photometry.medianL + deltaL));
  if (photometry.status === 'indeterminate') return { ...photometry, medianL };
  const itaDeg = itaDegrees(medianL, photometry.medianB);
  return { ...photometry, medianL, itaDeg, itaCategory: itaCategoryFor(itaDeg) };
}
