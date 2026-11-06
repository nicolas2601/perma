import {
  CENTER_OFF,
  CENTER_ON,
  CLOSER_OFF,
  CLOSER_ON,
  FARTHER_OFF,
  FARTHER_ON,
  FOCUS_OFF,
  FOCUS_ON,
  GLARE_OFF,
  GLARE_ON,
  LESS_LIGHT_OFF,
  LESS_LIGHT_ON,
  MORE_LIGHT_OFF,
  MORE_LIGHT_ON,
  MOTION_OFF,
  MOTION_ON,
  MOTION_WINDOW,
} from './constants';
import type { FrameReading } from './frame-pipeline';
import { Trigger } from './schmitt';
import type { AdviceId, ChipState, GuideStatus } from './types';

export interface Verdict {
  /** Highest-priority rule that is on, or `none`. Stability and dwell are applied later, by AdvicePolicy. */
  readonly candidate: AdviceId;
  readonly abstained: boolean;
  readonly status: GuideStatus;
}

interface RuleStates {
  readonly lessLight: boolean;
  readonly moreLight: boolean;
  readonly glare: boolean;
  readonly holdStill: boolean;
  readonly closer: boolean;
  readonly farther: boolean;
  readonly center: boolean;
  readonly blurry: boolean;
}

/**
 * Priority order: light first (nothing else can be judged in a dark or blown-out frame), then glare, then
 * sustained motion, then framing (size and centre), and focus last (the least reliable measurement).
 */
const PRIORITY: ReadonlyArray<readonly [keyof RuleStates, AdviceId]> = [
  ['lessLight', 'less-light'],
  ['moreLight', 'more-light'],
  ['glare', 'avoid-glare'],
  ['holdStill', 'hold-still'],
  ['closer', 'closer'],
  ['farther', 'farther'],
  ['center', 'center-area'],
  ['blurry', 'check-focus'],
];

/** Median of the last MOTION_WINDOW shift readings. Flat frames (null) do not enter the window. */
class ShiftWindow {
  private readonly values: number[] = [];

  push(value: number | null): number | null {
    if (value !== null) {
      this.values.push(value);
      if (this.values.length > MOTION_WINDOW) this.values.shift();
    }
    if (this.values.length === 0) return null;
    const sorted = [...this.values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? null;
  }
}

/** Stateful rule set: one Schmitt trigger per rule, so each rule keeps its own hysteresis and dwell. */
export class RuleEngine {
  private readonly lessLight = new Trigger(LESS_LIGHT_ON, LESS_LIGHT_OFF, 'above');
  private readonly moreLight = new Trigger(MORE_LIGHT_ON, MORE_LIGHT_OFF, 'below');
  private readonly glare = new Trigger(GLARE_ON, GLARE_OFF, 'above');
  private readonly holdStill = new Trigger(MOTION_ON, MOTION_OFF, 'above');
  private readonly closer = new Trigger(CLOSER_ON, CLOSER_OFF, 'below');
  private readonly farther = new Trigger(FARTHER_ON, FARTHER_OFF, 'above');
  private readonly center = new Trigger(CENTER_ON, CENTER_OFF, 'above');
  private readonly blurry = new Trigger(FOCUS_ON, FOCUS_OFF, 'below');
  private readonly shifts = new ShiftWindow();

  observe(reading: FrameReading): Verdict {
    const states = this.evaluate(reading);
    return {
      candidate: PRIORITY.find(([rule]) => states[rule])?.[1] ?? 'none',
      abstained: reading.blur?.abstained ?? false,
      status: statusOf(reading, states),
    };
  }

  private evaluate(reading: FrameReading): RuleStates {
    const size = reading.content?.sizeFraction ?? null;
    const offset = reading.content?.offset ?? null;
    const headSaysBlur = reading.blur !== null && !reading.blur.abstained && reading.blur.probability >= reading.blur.threshold;
    const focusTrigger = this.blurry.update(reading.focusRatio);
    return {
      lessLight: this.lessLight.update(reading.median),
      moreLight: this.moreLight.update(reading.median),
      glare: this.glare.update(reading.specularFraction),
      holdStill: this.holdStill.update(this.shifts.push(reading.shift)),
      closer: this.closer.update(size),
      farther: this.farther.update(size),
      center: this.center.update(offset),
      blurry: focusTrigger || headSaysBlur,
    };
  }
}

function chip(alert: boolean, measured: boolean): ChipState {
  if (!measured) return 'sin-dato';
  return alert ? 'revisar' : 'ok';
}

/**
 * Chip states. Focus is not judged while the camera moves (motion blur would be confused with defocus), nor
 * when exposure is already the problem (a dark or blown frame has too little detail to judge). Distance is not
 * judged without a content region. A chip is `ok` only when nothing alerts.
 */
function statusOf(reading: FrameReading, states: RuleStates): GuideStatus {
  const exposureIssue = states.lessLight || states.moreLight;
  return {
    light: chip(exposureIssue || states.glare, true),
    distance: chip(states.closer || states.farther || states.center, reading.content !== null),
    focus: chip(states.blurry, reading.focusRatio !== null && !states.holdStill && !exposureIssue),
  };
}
