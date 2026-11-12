import { parseWorkerOutbound } from './protocol';
import type { AdviceId, GuideStatus } from './types';

/** Minimal worker surface, so the client runs with a real Worker in the browser and a fake in tests. */
export interface WorkerPort {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onMessage(listener: (data: unknown) => void): void;
  terminate(): void;
}

export type WorkerOutcome =
  | { readonly kind: 'reading'; readonly candidate: AdviceId; readonly abstained: boolean; readonly status: GuideStatus }
  | { readonly kind: 'failure' };

export interface TimerPort {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface WorkerClientOptions {
  readonly port: WorkerPort;
  readonly deadlineMs: number;
  readonly timers: TimerPort;
  readonly onOutcome: (outcome: WorkerOutcome) => void;
  readonly onDeadline: () => void;
}

/**
 * Owns the worker conversation. Exactly one pending task at a time: `post` refuses while busy, so the
 * caller drops frames instead of queueing them. A reply whose id is not the pending one is stale and ignored.
 * If the pending task passes its deadline, the worker is terminated and `onDeadline` fires once.
 */
export class WorkerClient {
  private readonly options: WorkerClientOptions;
  private pendingId: number | null = null;
  private deadline: unknown = null;
  private nextId = 1;
  private closed = false;

  constructor(options: WorkerClientOptions) {
    this.options = options;
    options.port.onMessage(data => this.receive(data));
  }

  get busy(): boolean {
    return this.pendingId !== null;
  }

  /** Sends one analysis task. Returns false (frame dropped) when busy or closed. */
  post(pixels: ArrayBuffer, width: number, height: number): boolean {
    if (this.closed || this.pendingId !== null) return false;
    const id = this.nextId++;
    this.pendingId = id;
    this.options.port.postMessage({ kind: 'analyze', id, width, height, pixels }, [pixels]);
    this.deadline = this.options.timers.setTimeout(() => this.expire(id), this.options.deadlineMs);
    return true;
  }

  configure(model: unknown): void {
    if (!this.closed) this.options.port.postMessage({ kind: 'configure', model });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.clearPending();
    this.options.port.terminate();
  }

  private expire(id: number): void {
    if (this.pendingId !== id) return;
    this.close();
    this.options.onDeadline();
  }

  private receive(data: unknown): void {
    const reply = parseWorkerOutbound(data);
    if (!reply || this.closed || reply.id !== this.pendingId) return;
    this.clearPending();
    this.options.onOutcome(reply.kind === 'reading'
      ? { kind: 'reading', candidate: reply.candidate, abstained: reply.abstained, status: reply.status }
      : { kind: 'failure' });
  }

  private clearPending(): void {
    this.options.timers.clearTimeout(this.deadline);
    this.deadline = null;
    this.pendingId = null;
  }
}
