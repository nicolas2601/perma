import { InferenceError, type RecoveryScenario } from './types';

export const DEFAULT_TIMEOUT_MS = 60_000;
const TIMEOUT_REASON = 'inference-timeout';

export interface TransportOptions {
  timeoutMs: number;
  fetchImpl: typeof fetch;
  isOnline: () => boolean;
}

export const browserIsOnline = (): boolean => globalThis.navigator?.onLine !== false;

/** Same-origin relative paths; absolute URL only when a location exists (jsdom, browser). */
export function resolveApiUrl(path: string): string {
  const origin = globalThis.location?.origin;
  return origin ? new URL(path, origin).toString() : path;
}

/** Maps an HTTP status to the recovery scenario the user actually sees. */
export function scenarioForHttpStatus(status: number): RecoveryScenario {
  if (status === 429) return 'rate-limit';
  if (status === 401 || status === 403) return 'permission';
  if (status >= 500) return 'server-error';
  // 400 invalid image, 413 too large, 415 unsupported type, 422 missing field: the file was rejected.
  return 'file-unavailable';
}

function isOurTimeout(signal: AbortSignal): boolean {
  return signal.aborted && signal.reason === TIMEOUT_REASON;
}

/** Caller aborts are rethrown untouched so the UI can treat them as cancellation, not an error state. */
function toTransportError(error: unknown, ours: AbortSignal, caller?: AbortSignal): unknown {
  if (error instanceof InferenceError) return error;
  if (caller?.aborted) return error;
  if (isOurTimeout(ours)) return new InferenceError('timeout', 'Inference request timed out', { cause: error });
  if (error instanceof TypeError) return new InferenceError('offline', 'Network unavailable', { cause: error });
  return new InferenceError('server-error', 'Unexpected transport failure', { cause: error });
}

function linkCallerAbort(controller: AbortController, caller?: AbortSignal): () => void {
  if (!caller) return () => undefined;
  const forward = (): void => controller.abort(caller.reason);
  if (caller.aborted) forward();
  caller.addEventListener('abort', forward, { once: true });
  return () => caller.removeEventListener('abort', forward);
}

/**
 * Runs one request. The timeout covers the body read too, not only headers.
 * `read` receives the Response and must return a validated value or throw InferenceError.
 */
export async function performRequest<T>(
  options: TransportOptions,
  path: string,
  init: RequestInit,
  read: (response: Response) => Promise<T>,
  caller?: AbortSignal,
): Promise<T> {
  if (!options.isOnline()) {
    throw new InferenceError('offline', 'Browser reports no network connection');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(TIMEOUT_REASON), options.timeoutMs);
  const unlinkCaller = linkCallerAbort(controller, caller);
  try {
    const response = await options.fetchImpl(resolveApiUrl(path), {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
    });
    return await read(response);
  } catch (error) {
    throw toTransportError(error, controller.signal, caller);
  } finally {
    clearTimeout(timer);
    unlinkCaller();
  }
}
