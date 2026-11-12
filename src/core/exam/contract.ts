import type { InferenceResult, RecoveryScenario } from '@/core/inference/types';
import type { AbcdeCriterion, ExamRecord } from '@/core/storage/types';

/** States from design/architecture.md section 3. */
export type ExamPhase =
  | 'idle' | 'contextSet' | 'capturing' | 'reviewing' | 'consenting' | 'processing'
  | 'result' | 'inspecting' | 'abcde' | 'compare' | 'exporting' | 'exported'
  | `recover:${RecoveryScenario}`;

export interface ExamImage {
  /** Original, unmodified bytes for the viewer. */
  original: Blob;
  /** Resized copy for upload, EXIF location stripped. */
  upload: Blob;
  name: string;
  origin: 'camera' | 'file' | 'sample';
}

export interface ExamState {
  phase: ExamPhase;
  record: ExamRecord;
  image: ExamImage | null;
  result: InferenceResult | null;
  consented: boolean;
  /** Export acknowledgement: invalidated only when the record changes (never by language). */
  ackRegistryVersion: number | null;
}

export type ExamEvent =
  | { type: 'SET_SITE'; site: string | null }
  | { type: 'IMAGE_LOADED'; image: ExamImage }
  | { type: 'IMAGE_DISCARDED' }
  | { type: 'CONSENT'; value: boolean }
  | { type: 'SEND' }
  | { type: 'STOP_WAITING' }
  | { type: 'RESULT_OK'; result: InferenceResult }
  | { type: 'RECOVER'; scenario: RecoveryScenario }
  | { type: 'ABCDE_SET'; criterion: AbcdeCriterion; value: string | null }
  | { type: 'NOTE_SET'; note: string }
  | { type: 'ACK_EXPORT'; format: 'csv' | 'json' | 'pdf' }
  | { type: 'RESET' };

export interface ExamStore {
  getState(): ExamState;
  dispatch(event: ExamEvent): void;
  subscribe(listener: () => void): () => void;
}
