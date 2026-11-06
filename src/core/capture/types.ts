export type AdviceId =
  | 'closer' | 'more-light' | 'avoid-glare' | 'hold-still' | 'center-area' | 'check-focus' | 'none';

export interface Advice {
  id: AdviceId;
  /** True when the engine abstained (outside its validated range). */
  abstained: boolean;
}

export interface CaptureAdvisor {
  readonly engine: string;
  start(video: HTMLVideoElement): void;
  stop(): void;
  subscribe(listener: (advice: Advice) => void): () => void;
}
