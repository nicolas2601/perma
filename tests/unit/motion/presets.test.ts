import { describe, expect, it } from 'vitest';
import { resolveMotionPreset, type MotionPresetName } from '../../../src/core/motion/presets';
import { ENTRY_OFFSET_PX, MOTION_MS } from '../../../src/core/motion/tokens';

const NAMES: MotionPresetName[] = ['entry', 'sheet', 'indicator', 'crossfade'];

function durationsOf(name: MotionPresetName, reduced: boolean): number[] {
  const preset = resolveMotionPreset(name, reduced);
  const transitions = [preset.transition, preset.exitTransition].filter(Boolean);
  return transitions.map((t) => Number((t as { duration?: number }).duration) * 1000);
}

describe('resolveMotionPreset', () => {
  it.each(NAMES)('%s reduced variant has no transform and runs at most 100 ms', (name) => {
    const preset = resolveMotionPreset(name, true);
    const keys = [preset.initial, preset.animate, preset.exit ?? {}].flatMap((frame) => Object.keys(frame));
    expect(keys).not.toContain('transform');
    for (const ms of durationsOf(name, true)) expect(ms).toBeLessThanOrEqual(MOTION_MS.fade);
  });

  it('entry full variant moves 12 px with opacity and never uses ease-in', () => {
    const preset = resolveMotionPreset('entry', false);
    expect(preset.initial).toEqual({ opacity: 0, transform: `translateY(${ENTRY_OFFSET_PX}px)` });
    expect(preset.animate).toEqual({ opacity: 1, transform: 'translateY(0px)' });
    expect(JSON.stringify(preset.transition)).not.toContain('ease-in"');
  });

  it('sheet full variant uses the bounce-0 spring and an exit faster than the enter', () => {
    const preset = resolveMotionPreset('sheet', false);
    expect(preset.transition).toEqual({ type: 'spring', duration: 0.24, bounce: 0 });
    expect(preset.exitTransition).toEqual({ duration: 0.12, ease: [0.23, 1, 0.32, 1] });
    expect(MOTION_MS.sheetExit).toBeLessThan(MOTION_MS.sheet);
  });

  it('sheet reduced variant is an opacity crossfade', () => {
    const preset = resolveMotionPreset('sheet', true);
    expect(preset.animate).toEqual({ opacity: 1 });
    expect(preset.transition).toEqual({ duration: 0.1, ease: [0.23, 1, 0.32, 1] });
  });

  it('crossfade keeps the same opacity change in both modes', () => {
    expect(resolveMotionPreset('crossfade', true)).toEqual(resolveMotionPreset('crossfade', false));
  });
});
