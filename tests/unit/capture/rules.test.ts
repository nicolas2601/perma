import { describe, expect, it } from 'vitest';
import { FramePipeline, type FrameReading } from '@/core/capture/frame-pipeline';
import { chooseCandidate } from '@/core/capture/rules';
import { AdvicePolicy } from '@/core/capture/advice-policy';
import type { AdviceId } from '@/core/capture/types';
import {
  boxBlur,
  checkerboard,
  discOnBackground,
  EDGE,
  mapLuma,
  shifted,
  smoothGradient,
  texturedLuma,
  toFrame,
} from './fixtures';

/** Runs frames through one pipeline (so motion is between consecutive frames) and returns the candidates. */
function candidatesFor(lumaFrames: Float64Array[]): { readings: FrameReading[]; candidates: AdviceId[] } {
  const pipeline = new FramePipeline();
  const readings = lumaFrames.map(luma => pipeline.analyze(toFrame(luma)));
  const candidates = readings.map(reading => chooseCandidate(reading, 'none'));
  return { readings, candidates };
}

const single = (luma: Float64Array): AdviceId => candidatesFor([luma]).candidates[0] ?? 'none';

describe('rules on synthetic fixtures', () => {
  it('sharp textured scene gives no advice', () => {
    expect(single(texturedLuma(7))).toBe('none');
  });

  it('dark frame asks for more light', () => {
    const dark = mapLuma(texturedLuma(7), v => v * 0.02);
    expect(single(dark)).toBe('more-light');
  });

  it('global glare asks to avoid the reflection', () => {
    const glare = mapLuma(texturedLuma(7), v => Math.min(255, v * 2.5 + 90));
    expect(single(glare)).toBe('avoid-glare');
  });

  it('local specular highlight (a bright disc, not global) asks to avoid the reflection', () => {
    const base = texturedLuma(7);
    const local = mapLuma(base, (v, i) => (Math.hypot((i % EDGE) - 64, Math.floor(i / EDGE) - 64) < 22 ? 255 : v));
    const { readings, candidates } = candidatesFor([local]);
    expect(readings[0]?.glareFraction).toBeLessThan(0.9);
    expect(readings[0]?.specularFraction).toBeGreaterThan(0.03);
    expect(candidates[0]).toBe('avoid-glare');
  });

  it('smooth gradient has too little detail to judge focus', () => {
    expect(single(smoothGradient())).toBe('check-focus');
  });

  it('heavily defocused scene has too little detail to judge focus', () => {
    expect(single(boxBlur(texturedLuma(7), 6, 3))).toBe('check-focus');
  });

  it('moved camera between two frames asks to hold still', () => {
    const scene = texturedLuma(7, 70);
    const { readings, candidates } = candidatesFor([scene, shifted(scene, 12)]);
    expect(readings[0]?.motion).toBeNull();
    expect(readings[1]?.motion).toBeGreaterThan(6);
    expect(candidates[1]).toBe('hold-still');
  });

  it('a steady camera does not report motion', () => {
    const scene = texturedLuma(7, 70);
    const { readings } = candidatesFor([scene, scene]);
    expect(readings[1]?.motion).toBe(0);
  });

  it('small content in the middle asks to come closer', () => {
    const small = discOnBackground(64, 64, 12);
    const { readings, candidates } = candidatesFor([small]);
    expect(readings[0]?.content?.sizeFraction).toBeLessThan(0.35);
    expect(candidates[0]).toBe('closer');
  });

  it('off-centre content asks to centre the area', () => {
    const off = discOnBackground(30, 30, 12);
    expect(single(off)).toBe('center-area');
  });

  it('checkerboard: sharp, high contrast, never triggers exposure or focus advice', () => {
    expect(single(checkerboard())).toBe('none');
  });
});

describe('hysteresis and stability', () => {
  it('keeps an active exposure advice until the metric falls below the release level', () => {
    // A sharp scene (no focus or framing advice) with the dark share set to probe the thresholds.
    const sharp = new FramePipeline().analyze(toFrame(texturedLuma(7)));
    expect(chooseCandidate({ ...sharp, darkFraction: 0.85 }, 'none')).toBe('none');
    expect(chooseCandidate({ ...sharp, darkFraction: 0.85 }, 'more-light')).toBe('more-light');
    expect(chooseCandidate({ ...sharp, darkFraction: 0.75 }, 'more-light')).toBe('none');
  });

  it('changes advice only after two identical consecutive candidates', () => {
    const policy = new AdvicePolicy();
    expect(policy.observe('hold-still')).toBeNull();
    expect(policy.current).toBe('none');
    expect(policy.observe('hold-still')).toBe('hold-still');
    expect(policy.current).toBe('hold-still');
  });

  it('a flicker between two advices never reaches display', () => {
    const policy = new AdvicePolicy();
    const sequence: AdviceId[] = ['hold-still', 'closer', 'hold-still', 'closer', 'hold-still'];
    expect(sequence.map(id => policy.observe(id)).every(result => result === null)).toBe(true);
    expect(policy.current).toBe('none');
  });

  it('a candidate equal to the active advice resets the pending streak', () => {
    const policy = new AdvicePolicy();
    policy.observe('closer');
    policy.observe('none');
    expect(policy.observe('closer')).toBeNull();
  });
});
