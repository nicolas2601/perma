import {
  BLUR_RELEASE_MARGIN,
  CENTER_OFF,
  CENTER_ON,
  CLOSER_OFF,
  CLOSER_ON,
  DETAIL_OFF,
  DETAIL_ON,
  EXTREME_FRACTION,
  EXTREME_RELEASE_FRACTION,
  MOTION_OFF,
  MOTION_ON,
  SPECULAR_OFF,
  SPECULAR_ON,
} from './constants';
import type { FrameReading } from './frame-pipeline';
import type { AdviceId } from './types';

/** Hysteresis: a metric that is already active must fall past the release level to stop. */
const above = (value: number, on: number, off: number, active: boolean): boolean => value > (active ? off : on);
const below = (value: number, on: number, off: number, active: boolean): boolean => value < (active ? off : on);

const isDark = (reading: FrameReading, active: AdviceId): boolean =>
  above(reading.darkFraction, EXTREME_FRACTION, EXTREME_RELEASE_FRACTION, active === 'more-light');

function isGlaring(reading: FrameReading, active: AdviceId): boolean {
  const glare = active === 'avoid-glare';
  return above(reading.glareFraction, EXTREME_FRACTION, EXTREME_RELEASE_FRACTION, glare)
    || above(reading.specularFraction, SPECULAR_ON, SPECULAR_OFF, glare);
}

function isMoving(reading: FrameReading, active: AdviceId): boolean {
  return reading.motion !== null && above(reading.motion, MOTION_ON, MOTION_OFF, active === 'hold-still');
}

function isUnfocused(reading: FrameReading, active: AdviceId): boolean {
  const focus = active === 'check-focus';
  if (below(reading.laplacianVariance, DETAIL_ON, DETAIL_OFF, focus)) return true;
  const blur = reading.blur;
  if (!blur || blur.abstained) return false;
  return above(blur.probability, blur.threshold, blur.threshold - BLUR_RELEASE_MARGIN, focus);
}

/**
 * Picks one candidate advice for the frame, in priority order. `active` is the advice currently shown,
 * so the release thresholds apply to it. Stability (identical consecutive candidates) is applied later.
 */
export function chooseCandidate(reading: FrameReading, active: AdviceId): AdviceId {
  if (isDark(reading, active)) return 'more-light';
  if (isGlaring(reading, active)) return 'avoid-glare';
  if (isMoving(reading, active)) return 'hold-still';
  if (isUnfocused(reading, active)) return 'check-focus';
  const content = reading.content;
  if (content && above(content.offset, CENTER_ON, CENTER_OFF, active === 'center-area')) return 'center-area';
  if (content && below(content.sizeFraction, CLOSER_ON, CLOSER_OFF, active === 'closer')) return 'closer';
  return 'none';
}
