import type { WorkerPort } from '@/core/capture/worker-client';

/** Browser adapter: the capture worker as a module worker. Loaded only when the guide starts. */
export function createModuleWorker(): WorkerPort {
  const worker = new Worker(new URL('../../../core/capture/capture.worker.ts', import.meta.url), { type: 'module' });
  return {
    postMessage: (message, transfer) => worker.postMessage(message, transfer ?? []),
    onMessage: listener => {
      worker.onmessage = event => listener(event.data);
    },
    terminate: () => worker.terminate(),
  };
}
