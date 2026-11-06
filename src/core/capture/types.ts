export type AdviceId =
  | 'closer' | 'more-light' | 'avoid-glare' | 'hold-still' | 'center-area' | 'check-focus' | 'none';

/** `automatic`: live advice from the analysis pipeline. `manual`: the pipeline was degraded; no live advice. */
export type AdviceMode = 'automatic' | 'manual';

export interface Advice {
  id: AdviceId;
  /** True when the engine abstained (outside its validated range). */
  abstained: boolean;
  mode: AdviceMode;
}

export interface CaptureAdvisor {
  readonly engine: string;
  start(video: HTMLVideoElement): void;
  stop(): void;
  subscribe(listener: (advice: Advice) => void): () => void;
}
