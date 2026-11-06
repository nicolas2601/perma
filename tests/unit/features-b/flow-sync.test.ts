import { describe, expect, it } from 'vitest';
import { stepToward } from '@/features/inspect/flowSync';

describe('stepToward (phase sync for lane screens)', () => {
  it('returns null when the phase already matches the target', () => {
    expect(stepToward('abcde', 'abcde')).toBeNull();
    expect(stepToward('exporting', 'exporting')).toBeNull();
  });

  it('moves forward one legal command at a time', () => {
    expect(stepToward('result', 'abcde')).toEqual({ type: 'OPEN_INSPECT' });
    expect(stepToward('inspecting', 'abcde')).toEqual({ type: 'OPEN_ABCDE' });
    expect(stepToward('abcde', 'compare')).toEqual({ type: 'OPEN_COMPARE' });
    expect(stepToward('compare', 'exporting')).toEqual({ type: 'OPEN_EXPORT' });
  });

  it('moves back with BACK when the screen is behind the phase', () => {
    expect(stepToward('exporting', 'abcde')).toEqual({ type: 'BACK' });
    expect(stepToward('compare', 'abcde')).toEqual({ type: 'BACK' });
    expect(stepToward('abcde', 'inspecting')).toEqual({ type: 'BACK' });
  });

  it('stops at exported and at phases outside the review lane', () => {
    expect(stepToward('exported', 'exporting')).toBeNull();
    expect(stepToward('exported', 'abcde')).toBeNull();
    expect(stepToward('idle', 'abcde')).toBeNull();
    expect(stepToward('recover:offline', 'compare')).toBeNull();
  });
});
