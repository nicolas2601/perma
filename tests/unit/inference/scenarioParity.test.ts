import { describe, expect, it } from 'vitest';
import { LiveInferenceClient } from '@/core/inference/live';
import { MockInferenceClient } from '@/core/inference/mock';
import type { MockScenario } from '@/core/inference/mockScenario';
import { InferenceError, type RecoveryScenario } from '@/core/inference/types';
import { predictFailure, type HttpFailureScenario } from '@/mocks/msw/scenarios';
import { imageBlob, registerApiServer } from './support/apiServer';

const server = registerApiServer();

const ALL_RECOVERY = [
  'permission',
  'offline',
  'server-error',
  'timeout',
  'invalid-response',
  'rate-limit',
  'file-unavailable',
  'export-unavailable',
] as const satisfies readonly RecoveryScenario[];

/** Every recovery scenario must be drivable from the mock, so UI states are testable without HTTP. */
const MOCK_CASES: readonly MockScenario[] = ALL_RECOVERY;

/**
 * Scenarios that real HTTP responses or transport failures can produce. `export-unavailable`
 * has no HTTP origin (export is client-side), so it is mock-only by design.
 */
const LIVE_CASES: Partial<Record<RecoveryScenario, HttpFailureScenario>> = {
  'rate-limit': 'rate-limit',
  'server-error': 'server-error',
  'file-unavailable': 'file-unavailable',
  permission: 'permission',
  offline: 'offline',
  timeout: 'timeout',
  'invalid-response': 'invalid-response',
};

async function captureScenario(promise: Promise<unknown>): Promise<RecoveryScenario> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof InferenceError) return error.scenario;
    throw error;
  }
  throw new Error('expected a recovery scenario');
}

describe('scenario parity: mock drives all eight recovery scenarios', () => {
  it.each(MOCK_CASES.filter((s): s is RecoveryScenario => s !== 'success' && s !== 'slow'))(
    'mock %s surfaces the same scenario',
    async (scenario) => {
      const mock = new MockInferenceClient({ defaultModel: 'MOCO_HAM7', scenario, failureDelayMs: 0 });
      await expect(captureScenario(mock.predict({ file: imageBlob() }))).resolves.toBe(scenario);
    },
  );

  it('covers exactly the eight RecoveryScenario values', () => {
    expect(new Set(ALL_RECOVERY).size).toBe(8);
  });
});

describe('scenario parity: live maps the HTTP-reachable subset to the same scenario', () => {
  it.each(Object.entries(LIVE_CASES) as Array<[RecoveryScenario, HttpFailureScenario]>)(
    'live %s',
    async (expected, failure) => {
      server.use(predictFailure(failure));
      const live = new LiveInferenceClient({ defaultModel: 'MOCO_HAM7', timeoutMs: 50 });
      await expect(captureScenario(live.predict({ file: imageBlob() }))).resolves.toBe(expected);
    },
  );

  it('documents the mock-only scenario explicitly', () => {
    const httpReachable = Object.keys(LIVE_CASES);
    expect(ALL_RECOVERY.filter((s) => !httpReachable.includes(s))).toEqual(['export-unavailable']);
  });
});
