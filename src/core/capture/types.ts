/** One prioritised advice at a time. `none` means no advice is shown. */
export type AdviceId =
  | 'less-light' | 'more-light' | 'avoid-glare' | 'hold-still'
  | 'closer' | 'farther' | 'center-area' | 'check-focus' | 'none';

/**
 * Status of one guide chip. `ok` means no alert from that measurement. It never means the image is approved.
 * `revisar` means the measurement suggests a problem (tentative). `sin-dato` means no usable measurement.
 */
export type ChipState = 'ok' | 'revisar' | 'sin-dato';

export interface GuideStatus {
  readonly focus: ChipState;
  readonly light: ChipState;
  readonly distance: ChipState;
}

/** `automatic`: live advice from the analysis pipeline. `manual`: the pipeline was degraded; no live advice. */
export type AdviceMode = 'automatic' | 'manual';

export const NO_DATA_STATUS: GuideStatus = { focus: 'sin-dato', light: 'sin-dato', distance: 'sin-dato' };

export interface Advice {
  id: AdviceId;
  /** True when the engine abstained (outside its validated range). */
  abstained: boolean;
  mode: AdviceMode;
  /** Chip states for the guide. Independent of which advice is shown. */
  status: GuideStatus;
}

export interface CaptureAdvisor {
  readonly engine: string;
  start(video: HTMLVideoElement): void;
  stop(): void;
  subscribe(listener: (advice: Advice) => void): () => void;
}
