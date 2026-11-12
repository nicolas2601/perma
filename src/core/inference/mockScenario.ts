import type { RecoveryScenario } from './types';

/** `success` and `slow` are not failures; the other eight are the RecoveryScenario values. */
export type MockScenario = 'success' | 'slow' | RecoveryScenario;

export const MOCK_SCENARIOS: readonly MockScenario[] = [
  'success',
  'slow',
  'permission',
  'offline',
  'server-error',
  'timeout',
  'invalid-response',
  'rate-limit',
  'file-unavailable',
  'export-unavailable',
];

export const MOCK_SCENARIO_QUERY_KEY = 'mock';

export function isMockScenario(value: unknown): value is MockScenario {
  return typeof value === 'string' && (MOCK_SCENARIOS as readonly string[]).includes(value);
}

export function isFailureScenario(scenario: MockScenario): scenario is RecoveryScenario {
  return scenario !== 'success' && scenario !== 'slow';
}

/** Reads `?mock=<scenario>`. Unknown values are ignored (undefined), never guessed. */
export function parseMockScenario(search: string): MockScenario | undefined {
  const value = new URLSearchParams(search).get(MOCK_SCENARIO_QUERY_KEY);
  return isMockScenario(value) ? value : undefined;
}
