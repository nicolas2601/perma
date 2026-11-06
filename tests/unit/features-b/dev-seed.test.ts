import { describe, expect, it } from 'vitest';
import { DEV_MOCK_RESULT, devSeedRequested } from '@/features/inspect/devSeed';

describe('dev result seed', () => {
  it('is requested only by the exact seed=result query and only in dev builds', () => {
    expect(devSeedRequested('')).toBe(false);
    expect(devSeedRequested('?seed=other')).toBe(false);
    expect(devSeedRequested('?seed=result')).toBe(import.meta.env.DEV);
  });

  it('is a simulated result, never a live one', () => {
    expect(DEV_MOCK_RESULT.source).toBe('mock');
    expect(DEV_MOCK_RESULT.identity.modelId).toContain('simulado');
    const total = Object.values(DEV_MOCK_RESULT.scores).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});
