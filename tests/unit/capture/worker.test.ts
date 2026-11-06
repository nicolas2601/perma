import { describe, expect, it, vi } from 'vitest';
import { createWorkerHandler } from '@/core/capture/worker-handler';
import { WorkerClient, type WorkerOutcome, type WorkerPort, type TimerPort } from '@/core/capture/worker-client';
import { parseWorkerInbound, parseWorkerOutbound } from '@/core/capture/protocol';
import { CaptureInputError } from '@/core/capture/errors';
import { EDGE, texturedLuma, toFrame } from './fixtures';

const pixelsOf = (): ArrayBuffer => toFrame(texturedLuma(7)).rgba.slice().buffer;

/** Manual timers: the test decides when a deadline fires. */
function manualTimers() {
  const pending = new Map<number, () => void>();
  let next = 1;
  const timers: TimerPort = {
    setTimeout: callback => {
      const id = next++;
      pending.set(id, callback);
      return id;
    },
    clearTimeout: handle => pending.delete(handle as number),
  };
  return { timers, fire: () => { for (const [id, cb] of [...pending]) { pending.delete(id); cb(); } }, count: () => pending.size };
}

function fakePort() {
  const posted: { message: unknown; transfer?: Transferable[] }[] = [];
  let listener: ((data: unknown) => void) | null = null;
  const port: WorkerPort = {
    postMessage: (message, transfer) => { posted.push({ message, transfer }); },
    onMessage: next => { listener = next; },
    terminate: vi.fn(),
  };
  return { port, posted, deliver: (data: unknown) => listener?.(data), terminate: port.terminate as ReturnType<typeof vi.fn> };
}

function setup() {
  const outcomes: WorkerOutcome[] = [];
  const deadline = vi.fn();
  const fake = fakePort();
  const clock = manualTimers();
  const client = new WorkerClient({ port: fake.port, deadlineMs: 1500, timers: clock.timers, onOutcome: o => outcomes.push(o), onDeadline: deadline });
  const taskId = (): number => (fake.posted.at(-1)?.message as { id: number }).id;
  return { client, fake, clock, outcomes, deadline, taskId };
}

describe('worker client: one pending task', () => {
  it('refuses a second frame while busy, so frames are dropped instead of queued', () => {
    const { client, fake } = setup();
    expect(client.post(pixelsOf(), EDGE, EDGE, 'none')).toBe(true);
    expect(client.post(pixelsOf(), EDGE, EDGE, 'none')).toBe(false);
    expect(fake.posted).toHaveLength(1);
  });

  it('transfers the pixel buffer instead of copying it', () => {
    const { client, fake } = setup();
    const pixels = pixelsOf();
    client.post(pixels, EDGE, EDGE, 'none');
    expect(fake.posted[0]?.transfer).toEqual([pixels]);
  });

  it('delivers the reply of the pending task and frees the slot', () => {
    const { client, fake, outcomes, taskId } = setup();
    client.post(pixelsOf(), EDGE, EDGE, 'none');
    fake.deliver({ kind: 'reading', id: taskId(), candidate: 'hold-still', abstained: false });
    expect(outcomes).toEqual([{ kind: 'reading', candidate: 'hold-still', abstained: false }]);
    expect(client.busy).toBe(false);
  });
});

describe('worker client: deadline', () => {
  it('terminates the worker and reports the deadline once when no reply arrives in time', () => {
    const { client, fake, clock, deadline } = setup();
    client.post(pixelsOf(), EDGE, EDGE, 'none');
    clock.fire();
    expect(fake.terminate).toHaveBeenCalledTimes(1);
    expect(deadline).toHaveBeenCalledTimes(1);
    expect(client.post(pixelsOf(), EDGE, EDGE, 'none')).toBe(false);
  });

  it('clears the deadline when the reply arrives in time', () => {
    const { client, fake, clock, deadline, taskId } = setup();
    client.post(pixelsOf(), EDGE, EDGE, 'none');
    fake.deliver({ kind: 'reading', id: taskId(), candidate: 'none', abstained: false });
    clock.fire();
    expect(deadline).not.toHaveBeenCalled();
    expect(fake.terminate).not.toHaveBeenCalled();
  });
});

describe('worker client: stale and invalid replies', () => {
  it('ignores a reply whose id is not the pending one', () => {
    const { client, fake, outcomes, taskId } = setup();
    client.post(pixelsOf(), EDGE, EDGE, 'none');
    fake.deliver({ kind: 'reading', id: taskId() + 100, candidate: 'closer', abstained: false });
    expect(outcomes).toEqual([]);
    expect(client.busy).toBe(true);
  });

  it('ignores malformed replies', () => {
    const { client, fake, outcomes } = setup();
    client.post(pixelsOf(), EDGE, EDGE, 'none');
    fake.deliver({ kind: 'reading', id: 1, candidate: 'not-an-advice', abstained: false });
    fake.deliver('garbage');
    expect(outcomes).toEqual([]);
  });

  it('reports a typed failure for the pending task', () => {
    const { client, fake, outcomes, taskId } = setup();
    client.post(pixelsOf(), EDGE, EDGE, 'none');
    fake.deliver({ kind: 'failure', id: taskId(), code: 'invalid-frame' });
    expect(outcomes).toEqual([{ kind: 'failure' }]);
  });

  it('after close, nothing is posted and late replies are ignored', () => {
    const { client, fake, outcomes, taskId } = setup();
    client.post(pixelsOf(), EDGE, EDGE, 'none');
    client.close();
    fake.deliver({ kind: 'reading', id: taskId(), candidate: 'closer', abstained: false });
    expect(outcomes).toEqual([]);
    expect(client.post(pixelsOf(), EDGE, EDGE, 'none')).toBe(false);
  });
});

describe('worker handler (inside the worker)', () => {
  const analyze = (pixels: ArrayBuffer, width = EDGE, height = EDGE, id = 1) =>
    ({ kind: 'analyze', id, width, height, active: 'none', pixels });

  it('analyzes a valid frame and answers with a candidate', () => {
    const handle = createWorkerHandler();
    expect(handle(analyze(pixelsOf()))).toMatchObject({ kind: 'reading', id: 1, abstained: false });
  });

  it('rejects a buffer that does not match its geometry (invalid buffer)', () => {
    const handle = createWorkerHandler();
    expect(handle(analyze(new ArrayBuffer(100)))).toEqual({ kind: 'failure', id: 1, code: 'invalid-frame' });
  });

  it('rejects an out-of-range edge', () => {
    const handle = createWorkerHandler();
    expect(handle(analyze(pixelsOf(), 4, 4))).toEqual({ kind: 'failure', id: 1, code: 'invalid-frame' });
  });

  it('rejects an unknown message without throwing', () => {
    const handle = createWorkerHandler();
    expect(handle({ kind: 'upload', id: 2 })).toEqual({ kind: 'failure', id: -1, code: 'invalid-message' });
  });

  it('rejects an invalid model at configure time without throwing', () => {
    const handle = createWorkerHandler();
    expect(handle({ kind: 'configure', model: { version: 2, scope: 'other' } })).toEqual({ kind: 'failure', id: -1, code: 'invalid-message' });
  });
});

describe('protocol parsing', () => {
  it('throws a typed error for a non-object message', () => {
    expect(() => parseWorkerInbound(42)).toThrow(CaptureInputError);
  });

  it('returns null for replies it cannot understand', () => {
    expect(parseWorkerOutbound({ kind: 'reading', id: 'x' })).toBeNull();
    expect(parseWorkerOutbound({ kind: 'failure', id: 3, code: 'invalid-frame' })).toEqual({ kind: 'failure', id: 3, code: 'invalid-frame' });
  });
});
