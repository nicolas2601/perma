/**
 * Consent-lane adapter for `createInferenceClient` (not yet on develop).
 * Single-flight, deadline and cancellation live here so the page stays declarative.
 */
import {
  type InferenceClient,
  type InferenceResult,
  InferenceError,
  type PredictRequest,
} from '@/core/inference/types';
import { isMockBuild, readMockDeadline, readMockScenario } from '@/features/desk/mockScenario';
import { abortError } from './abort';
import { FakeInferenceClient } from './fakeClient';
import { LiveInferenceClient } from './liveClient';

export const DEFAULT_DEADLINE_MS = 30_000;

/** Picks the client from `?mock=` first, then the build flag, else the live API. */
export function createInferenceClient(search: string): InferenceClient {
  const scenario = readMockScenario(search);
  if (scenario) return new FakeInferenceClient(scenario);
  if (isMockBuild()) return new FakeInferenceClient('success');
  return new LiveInferenceClient();
}

export function deadlineFor(search: string): number {
  return readMockDeadline(search) ?? DEFAULT_DEADLINE_MS;
}

/**
 * One request with a hard deadline. When the deadline passes, the request is
 * aborted and the promise rejects with `timeout`. An external abort rejects with AbortError.
 */
export function runAnalysis(
  client: InferenceClient,
  request: PredictRequest & { signal: AbortSignal },
  deadlineMs: number,
): Promise<InferenceResult> {
  const controller = new AbortController();
  return new Promise<InferenceResult>((resolve, reject) => {
    if (request.signal.aborted) return reject(abortError());
    const onExternalAbort = () => {
      controller.abort();
      reject(abortError());
    };
    const timer = setTimeout(() => {
      controller.abort();
      reject(new InferenceError('timeout', 'deadline exceeded'));
    }, deadlineMs);
    request.signal.addEventListener('abort', onExternalAbort, { once: true });
    client
      .predict({ ...request, signal: controller.signal })
      .then(resolve, reject)
      .finally(() => {
        clearTimeout(timer);
        request.signal.removeEventListener('abort', onExternalAbort);
      });
  });
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

/** Aborts the in-flight request, if any. Late responses are discarded by the caller. */
export function stopAnalysis(): void {
  inFlight?.abort();
  inFlight = null;
}

export function isAnalysisInFlight(): boolean {
  return inFlight !== null;
}
