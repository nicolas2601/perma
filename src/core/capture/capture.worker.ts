/// <reference lib="webworker" />
// Dedicated worker entry: analysis only. No network, no storage, no frame retention.
import { createWorkerHandler } from './worker-handler';

const handle = createWorkerHandler();

globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
  const reply = handle(event.data);
  if (reply) globalThis.postMessage(reply);
});
