/// <reference types="node" />
import { Blob as NodeBlob } from 'node:buffer';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { inferenceHandlers } from '@/mocks/msw/handlers';

/**
 * Registers an MSW node server for the calling test file. Any request without a handler
 * fails the test (`onUnhandledFrame: 'error'`), so no test can reach the real API.
 */
export function registerApiServer() {
  const server = setupServer(...inferenceHandlers);
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  return server;
}

/** Counts requests that reach the server, for "never sent" assertions. */
export function countingRequests() {
  let count = 0;
  return {
    hit: () => {
      count += 1;
    },
    get count() {
      return count;
    },
  };
}

/**
 * Node's native Blob. jsdom's Blob serializes wrongly inside undici multipart bodies,
 * which MSW then rejects with a content-length mismatch.
 */
export function imageBlob(bytes = 'fake-webp-bytes'): Blob {
  return new NodeBlob([bytes], { type: 'image/webp' }) as unknown as Blob;
}
