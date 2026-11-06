import { getInferenceClient, InferenceError } from '@/core/inference';
import type { InferenceResult, RecoveryScenario } from '@/core/inference/types';

/** Failures the processing state can enter (architecture section 3, FAULT_SOURCES). */
const PROCESSING_SCENARIOS: ReadonlySet<RecoveryScenario> = new Set<RecoveryScenario>([
  'offline',
  'server-error',
  'timeout',
  'invalid-response',
  'rate-limit',
]);

/** Anything else is reported as an unavailable service; the cause is never guessed. */
const UNEXPECTED_SCENARIO: RecoveryScenario = 'server-error';

export function scenarioOfFailure(error: unknown): RecoveryScenario {
  if (error instanceof InferenceError && PROCESSING_SCENARIOS.has(error.scenario)) return error.scenario;
  return UNEXPECTED_SCENARIO;
}

let inFlight: AbortController | null = null;

/** Returns a controller for the only allowed request, or null when one is already running (G2). */
export function beginAnalysis(): AbortController | null {
  if (inFlight) return null;
  inFlight = new AbortController();
  return inFlight;
}

export function finishAnalysis(controller: AbortController): void {
  if (inFlight === controller) inFlight = null;
}

/** Aborts the in-flight request, if any. A late response is discarded by the caller. */
export function stopAnalysis(): void {
  inFlight?.abort();
  inFlight = null;
}

export function isAnalysisInFlight(): boolean {
  return inFlight !== null;
}

/** One predict call through the app-wide client (VITE_INFERENCE; `?mock=` applies only to the mock build). */
export function predictImage(file: Blob, signal: AbortSignal): Promise<InferenceResult> {
  return getInferenceClient().predict({ file, signal });
}
