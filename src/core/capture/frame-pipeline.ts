import { extractBlurFeatures } from './blur-features';
import type { BlurPrediction, BlurPredictor } from './blur-model';
import { GLARE_OFF, LESS_LIGHT_OFF, MORE_LIGHT_OFF, MOTION_OFF } from './constants';
import { validateFramePixels, type FramePixels } from './frame';
import { lumaOf, medianLuma } from './luma';
import {
  contentRegion,
  focusRatio,
  largestSpecularFraction,
  relativeGrid,
  shiftCells,
  type ContentRegion,
} from './signals';

export interface BlurReading extends BlurPrediction {
  readonly threshold: number;
}

/** Everything the rules need about one analysed frame. Metrics only: no pixels, no decisions. */
export interface FrameReading {
  /** Median luma of the guide crop, 0-255. Exposure: low is dark, high is overexposed. */
  readonly median: number;
  /** Share of the crop covered by the largest connected saturated region. */
  readonly specularFraction: number;
  /** Laplacian over luma variance; null for a flat frame. Low means soft. */
  readonly focusRatio: number | null;
  /** Camera shift since the previous analysed frame, in grid cells; null on the first or a flat frame. */
  readonly shift: number | null;
  readonly content: ContentRegion | null;
  /** Null when the head is disabled or was skipped because exposure or motion already decides. */
  readonly blur: BlurReading | null;
}

/** The blur head only judges frames that exposure and motion rules leave alone (as the reference did). */
function blurEligible(median: number, specular: number, shift: number | null): boolean {
  return median > MORE_LIGHT_OFF && median < LESS_LIGHT_OFF
    && specular < GLARE_OFF
    && (shift === null || shift < MOTION_OFF);
}

/**
 * Stateful per-frame measurement. Keeps only the previous relative grid (32 x 32 numbers),
 * never the pixels, so no frame content survives the call.
 */
export class FramePipeline {
  private previousGrid: Float64Array | null = null;
  private predictor: BlurPredictor | null = null;

  setPredictor(predictor: BlurPredictor | null): void {
    this.predictor = predictor;
  }

  analyze(input: FramePixels): FrameReading {
    const frame = validateFramePixels(input);
    const { width, height } = frame;
    const luma = lumaOf(frame);
    const grid = relativeGrid(luma, width, height);
    const shift = this.previousGrid ? shiftCells(grid, this.previousGrid) : null;
    this.previousGrid = grid.values;
    const median = medianLuma(luma);
    const specularFraction = largestSpecularFraction(luma, width, height);
    const predictor = this.predictor;
    const blur = predictor && blurEligible(median, specularFraction, shift)
      ? this.judgeBlur(predictor, extractBlurFeatures(luma, width, height))
      : null;
    return {
      median,
      specularFraction,
      focusRatio: focusRatio(luma, width, height),
      shift,
      content: contentRegion(luma, width, height),
      blur,
    };
  }

  private judgeBlur(predictor: BlurPredictor, features: number[]): BlurReading {
    return { ...predictor.predict(features), threshold: predictor.threshold };
  }
}
