import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { LiveInferenceClient } from '@/core/inference/live';
import { MockInferenceClient } from '@/core/inference/mock';
import { useInferenceStatus } from '@/core/inference/useInferenceStatus';
import { registerApiServer } from './support/apiServer';

const server = registerApiServer();

function wrapperFor() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useInferenceStatus', () => {
  it('exposes the live model identity from /api/status', async () => {
    const client = new LiveInferenceClient({ defaultModel: 'MOCO_HAM7' });
    const { result } = renderHook(() => useInferenceStatus(client), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ modelId: 'dermssl-v10-moco', sha256Verified: null });
  });

  it('surfaces a rate-limit as an error and does not retry against the shared API', async () => {
    let hits = 0;
    server.use(
      http.get('/api/status', () => {
        hits += 1;
        return HttpResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
      }),
    );
    const client = new LiveInferenceClient({ defaultModel: 'MOCO_HAM7' });
    const { result } = renderHook(() => useInferenceStatus(client), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ scenario: 'rate-limit' });
    expect(hits).toBe(1);
  });

  it('uses the mock identity when driven by the mock client', async () => {
    const client = new MockInferenceClient({ defaultModel: 'MOCO_HAM7' });
    const { result } = renderHook(() => useInferenceStatus(client), { wrapper: wrapperFor() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ modelId: 'simulated-MOCO_HAM7', sha256Verified: false });
  });
});
