import { describe, expect, it } from 'vitest';
import { ENTER_FRAMES } from '@/core/capture/constants';
import { FramePipeline } from '@/core/capture/frame-pipeline';
import { RuleEngine, type Verdict } from '@/core/capture/rules';
import type { AdviceId } from '@/core/capture/types';
import {
  boxBlur,
  discOnBackground,
  EDGE,
  handHeldPath,
  mapLuma,
  rng,
  smoothGradient,
  texturedLuma,
  toFrame,
  translated,
} from './fixtures';

/** Feeds frames through one pipeline and one engine (state carries over, as in a worker session). */
function run(lumaFrames: Float64Array[]): Verdict[] {
  const pipeline = new FramePipeline();
  const engine = new RuleEngine();
  return lumaFrames.map(luma => engine.observe(pipeline.analyze(toFrame(luma))));
}

/** A still frame held long enough for every rule to switch on (ENTER_FRAMES readings). */
const held = (luma: Float64Array): Verdict[] => run(Array.from({ length: ENTER_FRAMES + 1 }, () => luma));
const settled = (luma: Float64Array): AdviceId => held(luma).at(-1)?.candidate ?? 'none';

/**
 * A subject on a plain background: white-noise texture inside a centred disc (a sharp, detailed object), uniform
 * background. Framing needs a subject on a background; a texture filling the crop would read as "too close".
 */
function subject(seed = 7, radius = 40, centre: [number, number] = [64, 64]): Float64Array {
  const random = rng(seed);
  const out = new Float64Array(EDGE * EDGE).fill(120);
  for (let y = 0; y < EDGE; y++) {
    for (let x = 0; x < EDGE; x++) {
      if (Math.hypot(x - centre[0], y - centre[1]) <= radius) out[y * EDGE + x] = 128 + (random() - 0.5) * 100;
    }
  }
  return out;
}

/** Fraction of frames whose raw candidate is `id`. */
const share = (verdicts: Verdict[], id: AdviceId): number =>
  verdicts.filter(v => v.candidate === id).length / verdicts.length;

describe('rules on synthetic scenes (still frames)', () => {
  it('a sharp subject on a plain background gives no advice', () => {
    expect(settled(subject())).toBe('none');
  });

  it('dark frame asks for more light', () => {
    expect(settled(mapLuma(subject(), v => v * 0.1))).toBe('more-light');
  });

  it('dimmed but visible frame does not ask for more light', () => {
    expect(settled(mapLuma(subject(), v => v * 0.6))).toBe('none');
  });

  it('overexposed frame asks for less light', () => {
    expect(settled(mapLuma(subject(), v => Math.min(255, v * 2.4)))).toBe('less-light');
  });

  it('several local specular highlights ask to avoid the reflection', () => {
    const base = subject();
    const glare = mapLuma(base, (v, i) => (Math.hypot((i % EDGE) - 64, Math.floor(i / EDGE) - 64) < 18 ? 255 : v));
    expect(settled(glare)).toBe('avoid-glare');
  });

  it('a single small highlight is below the glare threshold', () => {
    const spot = mapLuma(subject(), (v, i) => (Math.hypot((i % EDGE) - 64, Math.floor(i / EDGE) - 64) < 5 ? 255 : v));
    expect(settled(spot)).toBe('none');
  });

  it('a flat gradient is too flat to judge focus (chip: sin dato, no alert)', () => {
    const [verdict] = held(smoothGradient()).slice(-1);
    expect(verdict?.candidate).toBe('none');
    expect(verdict?.status.focus).toBe('sin-dato');
  });

  it('a defocused subject asks to check the focus', () => {
    expect(settled(boxBlur(subject(), 3, 2))).toBe('check-focus');
  });

  it('small content in the middle asks to come closer', () => {
    expect(settled(discOnBackground(64, 64, 12))).toBe('closer');
  });

  it('content that fills the crop never asks to move back (close-up skin photos are valid)', () => {
    expect(settled(discOnBackground(64, 64, 60))).not.toBe('farther');
  });

  it('off-centre content asks to centre the area', () => {
    expect(settled(discOnBackground(34, 34, 36))).toBe('center-area');
  });

  it('a high-frequency texture that fills the crop is sharp: it never asks to refocus or to move back', () => {
    const checker = mapLuma(new Float64Array(EDGE * EDGE), (_v, i) => ((i % EDGE) + Math.floor(i / EDGE)) % 2 === 0 ? 98 : 158);
    expect(settled(checker)).toBe('none');
  });

  it('brightness drift between frames is not motion', () => {
    const scene = texturedLuma(7, 70);
    const frames = [scene, ...Array.from({ length: 30 }, (_, i) => scene.map(v => v * (1 + 0.03 * Math.sin(i))))];
    expect(share(run(frames), 'hold-still')).toBe(0);
  });
});

describe('motion regression: hand-shake must not read as sustained movement', () => {
  it('a hand-held path of 1-2 px steps never asks to hold still (over 60 frames)', () => {
    const scene = texturedLuma(7, 70);
    const frames = handHeldPath(60, 1, 2, 4).map(([dx, dy]) => translated(scene, dx, dy));
    expect(share(run(frames), 'hold-still')).toBe(0);
  });

  it('sustained large motion (5-7 px per frame) asks to hold still', () => {
    const scene = texturedLuma(7, 70);
    const frames = handHeldPath(40, 5, 7, 8).map(([dx, dy]) => translated(scene, dx, dy));
    const verdicts = run(frames);
    expect(share(verdicts.slice(ENTER_FRAMES + 2), 'hold-still')).toBeGreaterThan(0.8);
  });
});

describe('guide chips (ok / revisar / sin dato)', () => {
  const statusOf = (luma: Float64Array) => held(luma).at(-1)?.status;

  it('a sharp, well-exposed, centred subject shows no alert on any chip', () => {
    expect(statusOf(subject())).toEqual({ focus: 'ok', light: 'ok', distance: 'ok' });
  });

  it('a dark frame marks the light chip for review and does not judge focus', () => {
    expect(statusOf(mapLuma(subject(), v => v * 0.1))).toEqual({ light: 'revisar', focus: 'sin-dato', distance: 'ok' });
  });

  it('an overexposed frame does not judge focus either', () => {
    expect(statusOf(mapLuma(subject(), v => Math.min(255, v * 2.4)))).toMatchObject({ light: 'revisar', focus: 'sin-dato' });
  });

  it('a flat frame has no focus or framing measurement', () => {
    expect(statusOf(new Float64Array(EDGE * EDGE).fill(120))).toEqual({ focus: 'sin-dato', light: 'ok', distance: 'sin-dato' });
  });

  it('focus is not judged while the camera is moving (motion would be mistaken for blur)', () => {
    const scene = texturedLuma(7, 70);
    const frames = handHeldPath(30, 5, 7, 8).map(([dx, dy]) => translated(scene, dx, dy));
    expect(run(frames).at(-1)?.status.focus).toBe('sin-dato');
  });
});
