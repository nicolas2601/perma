import { extractBlurFeatures } from './blur-features';
import type { BlurPrediction, BlurPredictor } from './blur-model';
import { DARK_LUMA, EXTREME_FRACTION, GLARE_LUMA, MOTION_ON, SPECULAR_ON } from './constants';
import { validateFramePixels, type FramePixels } from './frame';
import { fractionAbove, fractionBelow, lumaOf } from './luma';
import {
  contentRegion,
  largestSpecularFraction,
  laplacianVariance,
  motionBetween,
  motionGrid,
  type ContentRegion,
} from './signals';

export interface BlurReading extends BlurPrediction {
  readonly threshold: number;
}

/** Everything the rules need about one analyzed frame. Metrics only: no pixels, no decisions. */
export interface FrameReading {
  readonly darkFraction: number;
  readonly glareFraction: number;
  readonly specularFraction: number;
  readonly laplacianVariance: number;
  /** Mean grid change since the previous analyzed frame; null on the first frame. */
  readonly motion: number | null;
  readonly content: ContentRegion | null;
  /** Null when the head is disabled or was skipped because exposure or motion already decides. */
  readonly blur: BlurReading | null;
}

interface Gate {
  readonly darkFraction: number;
  readonly glareFraction: number;
  readonly specularFraction: number;
  readonly motion: number | null;
}

/** The blur head only judges frames that exposure and motion rules leave alone (as the reference did). */
function blurEligible(gate: Gate): boolean {
  return gate.darkFraction <= EXTREME_FRACTION
    && gate.glareFraction <= EXTREME_FRACTION
    && gate.specularFraction < SPECULAR_ON
    && (gate.motion === null || gate.motion < MOTION_ON);
}

/**
 * Stateful per-frame measurement. Keeps only the previous motion grid (32 x 32 numbers),
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
    const grid = motionGrid(luma, width, height);
    const motion = this.previousGrid ? motionBetween(grid, this.previousGrid) : null;
    this.previousGrid = grid;
    const gate: Gate = {
      darkFraction: fractionBelow(luma, DARK_LUMA),
      glareFraction: fractionAbove(luma, GLARE_LUMA),
      specularFraction: largestSpecularFraction(luma, width, height),
      motion,
    };
    const predictor = this.predictor;
    const blur = predictor && blurEligible(gate)
      ? this.judgeBlur(predictor, extractBlurFeatures(luma, width, height))
      : null;
    return {
      ...gate,
      laplacianVariance: laplacianVariance(luma, width, height),
      content: contentRegion(luma, width, height),
      blur,
    };
  }

  private judgeBlur(predictor: BlurPredictor, features: number[]): BlurReading {
    return { ...predictor.predict(features), threshold: predictor.threshold };
  }
}
