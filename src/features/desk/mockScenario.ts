export const MOCK_SCENARIOS = [
  'success',
  'slow',
  'permission',
  'offline',
  'server-error',
  'timeout',
  'invalid-response',
  'rate-limit',
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

const MOCK_PARAM = 'mock';
const DEADLINE_PARAM = 'deadline';
const MAX_MOCK_DEADLINE_MS = 60_000;

function isMockScenario(value: string): value is MockScenario {
  return (MOCK_SCENARIOS as readonly string[]).includes(value);
}

/**
 * Reads the `?mock=<scenario>` contract. Unknown names return null so a typo
 * never silently activates the fake client.
 */
export function readMockScenario(search: string): MockScenario | null {
  const value = new URLSearchParams(search).get(MOCK_PARAM);
  return value !== null && isMockScenario(value) ? value : null;
}

/** Test-only deadline override, honored only together with `?mock=`. */
export function readMockDeadline(search: string): number | null {
  if (readMockScenario(search) === null) return null;
  const raw = Number(new URLSearchParams(search).get(DEADLINE_PARAM));
  return Number.isInteger(raw) && raw > 0 && raw <= MAX_MOCK_DEADLINE_MS ? raw : null;
}

export function isMockBuild(): boolean {
  return import.meta.env.VITE_INFERENCE === 'mock';
}
