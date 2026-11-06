import { parseMockScenario, type MockScenario } from '@/core/inference';

/**
 * Mock-only fault injection: `?mock=<scenario>` is honored only in the mock build
 * (VITE_INFERENCE=mock). Live builds ignore the query entirely.
 */
export function isMockFault(search: string, scenario: MockScenario): boolean {
  return import.meta.env.VITE_INFERENCE === 'mock' && parseMockScenario(search) === scenario;
}
