import { LIVE_MODEL_KEYS } from './contract';
import { LiveInferenceClient } from './live';
import { MockInferenceClient } from './mock';
import { parseMockScenario } from './mockScenario';
import type { InferenceClient, ModelId } from './types';

export type InferenceFlavor = 'live' | 'mock';

export interface InferenceEnv {
  VITE_INFERENCE?: string;
  VITE_DEFAULT_MODEL?: string;
}

export interface FactoryInput {
  env: InferenceEnv;
  /** Location search string; only read by the mock client (`?mock=<scenario>`). */
  search: string;
}

const DEFAULT_FLAVOR: InferenceFlavor = 'live';
const DEFAULT_MODEL: ModelId = 'MOCO_HAM7';
const MODEL_IDS: readonly ModelId[] = LIVE_MODEL_KEYS;

/** Fail fast on misconfiguration: a bad build flag must not silently select another backend. */
export function parseFlavor(value: string | undefined): InferenceFlavor {
  if (value === undefined || value === '') return DEFAULT_FLAVOR;
  if (value === 'live' || value === 'mock') return value;
  throw new Error(`VITE_INFERENCE must be "live" or "mock", got "${value}"`);
}

export function parseDefaultModel(value: string | undefined): ModelId {
  if (value === undefined || value === '') return DEFAULT_MODEL;
  const match = MODEL_IDS.find((id) => id === value);
  if (match) return match;
  throw new Error(`VITE_DEFAULT_MODEL must be one of ${MODEL_IDS.join(', ')}, got "${value}"`);
}

export function createInferenceClient(input: FactoryInput): InferenceClient {
  const flavor = parseFlavor(input.env.VITE_INFERENCE);
  const defaultModel = parseDefaultModel(input.env.VITE_DEFAULT_MODEL);
  if (flavor === 'live') {
    return new LiveInferenceClient({ defaultModel });
  }
  return new MockInferenceClient({ defaultModel, scenario: parseMockScenario(input.search) });
}

export function readFactoryInput(): FactoryInput {
  return {
    env: import.meta.env,
    search: globalThis.location?.search ?? '',
  };
}

let shared: InferenceClient | undefined;

/** One client per app. Built from VITE_INFERENCE / VITE_DEFAULT_MODEL on first use. */
export function getInferenceClient(): InferenceClient {
  shared ??= createInferenceClient(readFactoryInput());
  return shared;
}
