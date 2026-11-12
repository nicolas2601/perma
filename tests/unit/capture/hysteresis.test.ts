import { describe, expect, it } from 'vitest';
import { ENTER_FRAMES, EXIT_FRAMES, MIN_DWELL_MS, STABILITY_FRAMES } from '@/core/capture/constants';
import { AdvicePolicy } from '@/core/capture/advice-policy';
import { Trigger } from '@/core/capture/schmitt';
import type { AdviceId } from '@/core/capture/types';

/** Feeds a value sequence to a trigger and returns the state after each reading. */
const states = (trigger: Trigger, values: Array<number | null>): boolean[] => values.map(v => trigger.update(v));

describe('Trigger (Schmitt rule with dwell)', () => {
  it('switches on only after ENTER_FRAMES consecutive readings past the ON level', () => {
    const trigger = new Trigger(0.5, 0.3, 'above');
    const seen = states(trigger, Array.from({ length: ENTER_FRAMES }, () => 0.9));
    expect(seen.slice(0, ENTER_FRAMES - 1).every(on => !on)).toBe(true);
    expect(seen.at(-1)).toBe(true);
  });

  it('a single reading past ON does not switch on (no spike)', () => {
    const trigger = new Trigger(0.5, 0.3, 'above');
    expect(states(trigger, [0.9, 0.1, 0.9, 0.1]).every(on => !on)).toBe(true);
  });

  it('stays on inside the hysteresis band and switches off only past the release level for EXIT_FRAMES', () => {
    const trigger = new Trigger(0.5, 0.3, 'above');
    states(trigger, Array.from({ length: ENTER_FRAMES }, () => 0.9));
    expect(states(trigger, [0.4, 0.4, 0.4, 0.4, 0.4, 0.4]).every(on => on)).toBe(true);
    const release = states(trigger, Array.from({ length: EXIT_FRAMES }, () => 0.2));
    expect(release.at(-1)).toBe(false);
    expect(release.slice(0, EXIT_FRAMES - 1).every(on => on)).toBe(true);
  });

  it('a null reading keeps the state and does not count toward dwell', () => {
    const trigger = new Trigger(0.5, 0.3, 'above');
    states(trigger, [0.9, 0.9]);
    expect(states(trigger, [null, null, null, 0.9]).at(-1)).toBe(true);
  });

  it('works in the below direction (focus: low ratio means soft)', () => {
    const trigger = new Trigger(0.1, 0.14, 'below');
    expect(states(trigger, Array.from({ length: ENTER_FRAMES }, () => 0.05)).at(-1)).toBe(true);
    expect(states(trigger, [0.12, 0.12, 0.12, 0.12]).every(on => on)).toBe(true);
    expect(states(trigger, Array.from({ length: EXIT_FRAMES }, () => 0.2)).at(-1)).toBe(false);
  });
});

describe('AdvicePolicy (display stability and dwell)', () => {
  it('changes advice only after STABILITY_FRAMES identical consecutive candidates', () => {
    const policy = new AdvicePolicy();
    expect(policy.observe('hold-still', 0)).toBeNull();
    expect(policy.current).toBe('none');
    expect(policy.observe('hold-still', 100)).toBe('hold-still');
    expect(policy.current).toBe('hold-still');
  });

  it('a flicker between two advices never reaches display', () => {
    const policy = new AdvicePolicy();
    const sequence: AdviceId[] = ['closer', 'center-area', 'closer', 'center-area', 'closer'];
    expect(sequence.map((id, i) => policy.observe(id, i * 100)).every(result => result === null)).toBe(true);
    expect(policy.current).toBe('none');
  });

  it('a candidate equal to the active advice resets the pending streak', () => {
    const policy = new AdvicePolicy();
    policy.observe('closer', 0);
    policy.observe('none', 100);
    expect(policy.observe('closer', 200)).toBeNull();
  });

  it('a shown advice stays for at least MIN_DWELL_MS before another replaces it', () => {
    const policy = new AdvicePolicy();
    policy.observe('closer', 0);
    policy.observe('closer', 100);
    expect(policy.current).toBe('closer');
    const during = Array.from({ length: STABILITY_FRAMES }, (_, i) => policy.observe('farther', 200 + i * 100));
    expect(during.every(result => result === null)).toBe(true);
    expect(policy.observe('farther', 100 + MIN_DWELL_MS)).toBe('farther');
  });
});
