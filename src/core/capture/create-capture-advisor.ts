import { DEADLINE_MS, MAX_CONSECUTIVE_FAILURES, TARGET_FPS, ANALYSIS_EDGE } from './constants';
import { AdvicePolicy } from './advice-policy';
import { captureGuideCrop, createOffscreenSampleCanvas, createVideoFrameScheduler, type FrameScheduler, type SampleCanvas } from './frame-sampler';
import { loadBlurHead, type BlurHeadLoad } from './model-loader';
import { WorkerClient, type WorkerOutcome, type WorkerPort, type TimerPort } from './worker-client';
import type { Advice, AdviceId, CaptureAdvisor } from './types';

export interface CaptureAdvisorOptions {
  /** Creates the analysis worker. The browser adapter wraps `new Worker(...)`; tests inject a fake. */
  readonly createWorker: () => WorkerPort;
  readonly loadBlurHead?: () => Promise<BlurHeadLoad>;
  readonly createSampleCanvas?: () => SampleCanvas | null;
  readonly createScheduler?: (video: HTMLVideoElement) => FrameScheduler;
  readonly now?: () => number;
  readonly timers?: TimerPort;
  readonly targetFps?: number;
  readonly deadlineMs?: number;
}

type AdviceListener = (advice: Advice) => void;

const defaultTimers: TimerPort = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: handle => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

const MANUAL_ADVICE: Advice = { id: 'none', abstained: false, mode: 'manual' };

/**
 * Live capture advice. Frames are sampled at most TARGET_FPS, dropped while the worker is busy, and
 * analyzed off the main thread. Nothing is sent over the network, stored, or kept after analysis.
 * If the worker misses its deadline or fails repeatedly, advice degrades to manual and the capture
 * path is never affected.
 */
export function createCaptureAdvisor(options: CaptureAdvisorOptions): CaptureAdvisor {
  const runtime = new AdvisorRuntime(options);
  return runtime.advisor();
}

class AdvisorRuntime {
  private readonly options: CaptureAdvisorOptions;
  private readonly listeners = new Set<AdviceListener>();
  private readonly policy = new AdvicePolicy();
  private readonly minIntervalMs: number;
  private readonly timers: TimerPort;
  private readonly now: () => number;
  private canvas: SampleCanvas | null = null;
  private scheduler: FrameScheduler | null = null;
  private client: WorkerClient | null = null;
  private session = 0;
  private lastSentAt = Number.NEGATIVE_INFINITY;
  private failures = 0;
  private mode: 'automatic' | 'manual' = 'automatic';
  private engineName = 'rules';
  private video: HTMLVideoElement | null = null;

  constructor(options: CaptureAdvisorOptions) {
    this.options = options;
    this.minIntervalMs = 1000 / (options.targetFps ?? TARGET_FPS);
    this.timers = options.timers ?? defaultTimers;
    this.now = options.now ?? (() => performance.now());
  }

  advisor(): CaptureAdvisor {
    const engine = (): string => this.engineName;
    return {
      get engine() {
        return engine();
      },
      start: video => this.start(video),
      stop: () => this.stop(),
      subscribe: listener => this.subscribe(listener),
    };
  }

  private subscribe(listener: AdviceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private start(video: HTMLVideoElement): void {
    if (this.video) return;
    this.video = video;
    this.session++;
    this.mode = 'automatic';
    this.failures = 0;
    this.lastSentAt = Number.NEGATIVE_INFINITY;
    this.canvas = (this.options.createSampleCanvas ?? createOffscreenSampleCanvas)();
    if (!this.canvas) return this.degrade();
    this.client = this.openClient();
    this.loadHead(this.session);
    this.scheduler = (this.options.createScheduler ?? createVideoFrameScheduler)(video);
    this.scheduler.start(() => this.tick());
  }

  private openClient(): WorkerClient {
    return new WorkerClient({
      port: this.options.createWorker(),
      deadlineMs: this.options.deadlineMs ?? DEADLINE_MS,
      timers: this.timers,
      onOutcome: outcome => this.receive(outcome),
      onDeadline: () => this.degrade(),
    });
  }

  private loadHead(session: number): void {
    const load = this.options.loadBlurHead ?? loadBlurHead;
    void load().then(result => {
      if (session !== this.session || !this.client || !result.enabled) return;
      this.client.configure(result.model);
      this.engineName = 'rules+blur-head';
    });
  }

  private tick(): void {
    const client = this.client;
    const video = this.video;
    if (!client || !video || client.busy || this.mode !== 'automatic') return;
    const now = this.now();
    if (now - this.lastSentAt < this.minIntervalMs) return;
    const pixels = this.canvas ? captureGuideCrop(this.canvas, video) : null;
    if (!pixels) return;
    if (client.post(pixels, ANALYSIS_EDGE, ANALYSIS_EDGE, this.policy.current)) this.lastSentAt = now;
  }

  private receive(outcome: WorkerOutcome): void {
    if (outcome.kind === 'failure') {
      this.failures++;
      if (this.failures >= MAX_CONSECUTIVE_FAILURES) this.degrade();
      return;
    }
    this.failures = 0;
    this.publishCandidate(outcome.candidate, outcome.abstained);
  }

  private publishCandidate(candidate: AdviceId, abstained: boolean): void {
    const changed = this.policy.observe(candidate);
    if (changed !== null) this.emit({ id: changed, abstained, mode: 'automatic' });
  }

  private degrade(): void {
    if (this.mode === 'manual') return;
    this.mode = 'manual';
    this.scheduler?.stop();
    this.scheduler = null;
    this.client?.close();
    this.client = null;
    this.emit(MANUAL_ADVICE);
  }

  private stop(): void {
    this.session++;
    this.scheduler?.stop();
    this.scheduler = null;
    this.client?.close();
    this.client = null;
    this.canvas = null;
    this.video = null;
  }

  private emit(advice: Advice): void {
    for (const listener of this.listeners) listener(advice);
  }
}
