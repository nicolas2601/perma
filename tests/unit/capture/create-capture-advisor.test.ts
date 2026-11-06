import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCaptureAdvisor, type CaptureAdvisorOptions } from '@/core/capture/create-capture-advisor';
import type { FrameScheduler, SampleCanvas } from '@/core/capture/frame-sampler';
import type { WorkerPort, TimerPort } from '@/core/capture/worker-client';
import type { Advice } from '@/core/capture/types';
import type { BlurHeadLoad } from '@/core/capture/model-loader';
import { texturedLuma, toFrame } from './fixtures';

const VIDEO = { videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement;

class FakeWorker implements WorkerPort {
  readonly posted: { message: { kind: string; id?: number }; transfer?: Transferable[] }[] = [];
  terminated = 0;
  private listener: ((data: unknown) => void) | null = null;
  postMessage(message: unknown, transfer?: Transferable[]): void {
    this.posted.push({ message: message as { kind: string; id?: number }, transfer });
  }
  onMessage(listener: (data: unknown) => void): void {
    this.listener = listener;
  }
  terminate(): void {
    this.terminated++;
  }
  reply(data: unknown): void {
    this.listener?.(data);
  }
  analyses(): { kind: string; id?: number }[] {
    return this.posted.map(p => p.message).filter(m => m.kind === 'analyze');
  }
  lastTaskId(): number {
    return this.analyses().at(-1)?.id ?? -1;
  }
  readingFor(candidate: string, abstained = false, id = this.lastTaskId()): unknown {
    return { kind: 'reading', id, candidate, abstained };
  }
}

function harness(overrides: Partial<CaptureAdvisorOptions> = {}) {
  const worker = new FakeWorker();
  let tick: (() => void) | null = null;
  const scheduler: FrameScheduler = {
    start: next => { tick = next; },
    stop: vi.fn(() => { tick = null; }),
  };
  const canvas: SampleCanvas = {
    drawImage: vi.fn(),
    readRgba: () => toFrame(texturedLuma(7)).rgba.slice().buffer,
  };
  let clock = 0;
  const timerQueue = new Map<number, () => void>();
  let timerId = 1;
  const timers: TimerPort = {
    setTimeout: callback => { const id = timerId++; timerQueue.set(id, callback); return id; },
    clearTimeout: handle => timerQueue.delete(handle as number),
  };
  const options: CaptureAdvisorOptions = {
    createWorker: () => worker,
    loadBlurHead: () => Promise.resolve<BlurHeadLoad>({ enabled: false, reason: 'test' }),
    createSampleCanvas: () => canvas,
    createScheduler: () => scheduler,
    now: () => clock,
    timers,
    ...overrides,
  };
  const advisor = createCaptureAdvisor(options);
  const emitted: Advice[] = [];
  advisor.subscribe(advice => emitted.push(advice));
  return {
    advisor,
    worker,
    emitted,
    scheduler,
    frame: () => tick?.(),
    advanceMs: (ms: number) => { clock += ms; },
    runTimers: (ms: number) => { clock += ms; for (const [id, cb] of [...timerQueue]) { timerQueue.delete(id); cb(); } },
    timersPending: () => timerQueue.size,
  };
}

/** Lets the async model-load promise settle. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('capture advisor: sampling and stability', () => {
  it('shows an advice only after two identical consecutive readings', async () => {
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    h.frame();
    h.worker.reply(h.worker.readingFor('hold-still'));
    expect(h.emitted).toEqual([]);
    h.advanceMs(200);
    h.frame();
    h.worker.reply(h.worker.readingFor('hold-still'));
    expect(h.emitted).toEqual([{ id: 'hold-still', abstained: false, mode: 'automatic' }]);
  });

  it('drops frames while the worker is busy (one pending task)', async () => {
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    h.frame();
    h.advanceMs(500);
    h.frame();
    h.frame();
    expect(h.worker.analyses()).toHaveLength(1);
  });

  it('caps the analysis rate at the target fps', async () => {
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    h.frame();
    h.worker.reply(h.worker.readingFor('none'));
    h.advanceMs(50);
    h.frame();
    expect(h.worker.analyses()).toHaveLength(1);
    h.advanceMs(60);
    h.frame();
    expect(h.worker.analyses()).toHaveLength(2);
  });

  it('transfers the pixel buffer to the worker on every task', async () => {
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    h.frame();
    const transfer = h.worker.posted.find(p => p.message.kind === 'analyze')?.transfer;
    expect(transfer).toHaveLength(1);
    expect(transfer?.[0]).toBeInstanceOf(ArrayBuffer);
  });

  it('does not analyze while the video has no size yet', async () => {
    const h = harness({ createSampleCanvas: () => ({ drawImage: vi.fn(), readRgba: () => null }) });
    h.advisor.start({ videoWidth: 0, videoHeight: 0 } as unknown as HTMLVideoElement);
    await settle();
    h.frame();
    expect(h.worker.analyses()).toHaveLength(0);
  });
});

describe('capture advisor: degradation to manual', () => {
  it('terminates the worker and shows manual advice when the deadline passes', async () => {
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    h.frame();
    h.runTimers(1500);
    expect(h.worker.terminated).toBe(1);
    expect(h.emitted).toEqual([{ id: 'none', abstained: false, mode: 'manual' }]);
    h.advanceMs(500);
    h.frame();
    expect(h.worker.analyses()).toHaveLength(1);
  });

  it('degrades after repeated invalid-frame failures', async () => {
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    for (let i = 0; i < 3; i++) {
      h.advanceMs(200);
      h.frame();
      h.worker.reply({ kind: 'failure', id: h.worker.lastTaskId(), code: 'invalid-frame' });
    }
    expect(h.emitted).toEqual([{ id: 'none', abstained: false, mode: 'manual' }]);
  });

  it('a single failure does not degrade', async () => {
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    h.frame();
    h.worker.reply({ kind: 'failure', id: h.worker.lastTaskId(), code: 'invalid-frame' });
    expect(h.emitted).toEqual([]);
    expect(h.worker.terminated).toBe(0);
  });

  it('degrades when the sample surface is unavailable', () => {
    const h = harness({ createSampleCanvas: () => null });
    h.advisor.start(VIDEO);
    expect(h.emitted).toEqual([{ id: 'none', abstained: false, mode: 'manual' }]);
  });
});

describe('capture advisor: model on demand and engine', () => {
  it('runs rules only when the blur head is disabled by its gate', async () => {
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    expect(h.advisor.engine).toBe('rules');
    expect(h.worker.posted.some(p => p.message.kind === 'configure')).toBe(false);
  });

  it('configures the worker and reports the blur head when the gate is passed', async () => {
    const model = { version: 2 } as unknown;
    const h = harness({
      loadBlurHead: () => Promise.resolve({ enabled: true, model: model as never }),
    });
    h.advisor.start(VIDEO);
    await settle();
    expect(h.advisor.engine).toBe('rules+blur-head');
    expect(h.worker.posted.find(p => p.message.kind === 'configure')).toBeDefined();
  });

  it('ignores a model that arrives after stop()', async () => {
    let resolve: (value: BlurHeadLoad) => void = () => undefined;
    const h = harness({ loadBlurHead: () => new Promise<BlurHeadLoad>(r => { resolve = r; }) });
    h.advisor.start(VIDEO);
    h.advisor.stop();
    resolve({ enabled: true, model: {} as never });
    await settle();
    expect(h.worker.posted.some(p => p.message.kind === 'configure')).toBe(false);
  });
});

describe('capture advisor: lifecycle', () => {
  it('stop terminates the worker, stops sampling and emits nothing further', async () => {
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    h.frame();
    h.advisor.stop();
    expect(h.scheduler.stop).toHaveBeenCalled();
    expect(h.worker.terminated).toBe(1);
    h.worker.reply(h.worker.readingFor('closer', false));
    h.worker.reply(h.worker.readingFor('closer', false));
    expect(h.emitted).toEqual([]);
  });

  it('subscribe returns an unsubscribe function', async () => {
    const h = harness();
    const seen: Advice[] = [];
    const off = h.advisor.subscribe(a => seen.push(a));
    off();
    h.advisor.start(VIDEO);
    await settle();
    h.frame();
    h.worker.reply(h.worker.readingFor('closer'));
    h.frame();
    h.worker.reply(h.worker.readingFor('closer'));
    expect(seen).toEqual([]);
  });
});

describe('capture advisor: privacy', () => {
  it('makes no network, storage or cache calls while advising', async () => {
    const network = { fetch: vi.spyOn(globalThis, 'fetch'), send: vi.spyOn(XMLHttpRequest.prototype, 'send'), beacon: vi.fn() };
    Object.defineProperty(navigator, 'sendBeacon', { value: network.beacon, configurable: true });
    const storage = {
      local: vi.spyOn(Storage.prototype, 'setItem'),
      session: vi.spyOn(Storage.prototype, 'getItem'),
    };
    const h = harness();
    h.advisor.start(VIDEO);
    await settle();
    for (let i = 0; i < 40; i++) {
      h.advanceMs(120);
      h.frame();
      h.worker.reply(h.worker.readingFor(i % 3 === 0 ? 'hold-still' : 'none'));
    }
    h.advisor.stop();
    expect(h.worker.analyses().length).toBeGreaterThan(0);
    expect(network.fetch).not.toHaveBeenCalled();
    expect(network.send).not.toHaveBeenCalled();
    expect(network.beacon).not.toHaveBeenCalled();
    expect(storage.local).not.toHaveBeenCalled();
    expect(storage.session).not.toHaveBeenCalled();
  });
});
