import { describe, expect, it } from 'vitest';
import { homeEntryVariants } from '../../../src/core/motion/homeEntry';
import { STAGGER_RANGE_MS } from '../../../src/core/motion/tokens';

describe('homeEntryVariants', () => {
  it('staggers children 80 ms apart, inside the 60-100 ms brief range', () => {
    const { container } = homeEntryVariants(false);
    const staggerMs = (container.show as { transition: { staggerChildren: number } }).transition.staggerChildren * 1000;
    expect(staggerMs).toBe(80);
    expect(staggerMs).toBeGreaterThanOrEqual(STAGGER_RANGE_MS.min);
    expect(staggerMs).toBeLessThanOrEqual(STAGGER_RANGE_MS.max);
  });

  it('moves children 12 px with opacity and never scales from 0', () => {
    const { item } = homeEntryVariants(false);
    expect(item.hidden).toEqual({ opacity: 0, transform: 'translateY(12px)' });
    expect(item.show).toMatchObject({ opacity: 1, transform: 'translateY(0px)' });
    expect(JSON.stringify(item)).not.toMatch(/scale\(\s*0\s*\)/);
  });

  it('reduced: no stagger, no offset, a 100 ms opacity crossfade', () => {
    const { container, item } = homeEntryVariants(true);
    expect((container.show as { transition: { staggerChildren: number } }).transition.staggerChildren).toBe(0);
    expect(item.hidden).toEqual({ opacity: 0 });
    expect(item.show).toMatchObject({ opacity: 1, transition: { duration: 0.1 } });
    expect(JSON.stringify(item)).not.toContain('transform');
  });
});
