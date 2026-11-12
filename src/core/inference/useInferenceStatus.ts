import { useQuery } from '@tanstack/react-query';
import { getInferenceClient } from './factory';
import type { DataSource, InferenceClient } from './types';

const STATUS_STALE_MS = 5 * 60_000;

export function inferenceStatusQueryKey(source: DataSource) {
  return ['inference', 'status', source] as const;
}

/**
 * Health and model identity from /api/status (or the mock). Retries are off on purpose:
 * a 429 or 5xx must not turn into a retry storm against the shared research API.
 */
export function useInferenceStatus(client: InferenceClient = getInferenceClient()) {
  return useQuery({
    queryKey: inferenceStatusQueryKey(client.source),
    queryFn: ({ signal }) => client.status(signal),
    staleTime: STATUS_STALE_MS,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
