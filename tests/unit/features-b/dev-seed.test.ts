import { describe, expect, it } from 'vitest';
import { devSeedRequested, loadDevSeedResult, seedResultCommands } from '@/features/inspect/devSeed';

describe('dev seed', () => {
  it('only seeds when the URL asks for the result seed (dev builds)', () => {
    expect(devSeedRequested('')).toBe(false);
    expect(devSeedRequested('?seed=other')).toBe(false);
    expect(devSeedRequested('?seed=result')).toBe(import.meta.env.DEV);
  });

  it('invents no result: without a captured replay it seeds nothing', async () => {
    expect(await loadDevSeedResult()).toBeNull();
    expect(await seedResultCommands()).toEqual([]);
  });
});
