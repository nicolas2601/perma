import type { InferenceResult } from '@/core/inference/types';
import type { ExamRecord, ImageOrigin } from '@/core/storage/types';

export type ExportFormat = 'json' | 'pdf';

/** Everything an export needs, copied out of the exam state. */
export interface ExportSnapshot {
  record: ExamRecord;
  image: { name: string; origin: ImageOrigin } | null;
  result: InferenceResult | null;
}

export type ExportFailureReason = 'build-failed' | 'download-failed';

/** ok:true only after the Blob exists and the download was triggered. */
export type ExportResult =
  | { ok: true; filename: string; bytes: number }
  | { ok: false; reason: ExportFailureReason };

/** Full copy keys (core keys or namespaced feature keys such as `desk.ctxExportTitle`). */
export type Translate = (key: string) => string;

export const UNANSWERED_VALUE = 'unanswered';
