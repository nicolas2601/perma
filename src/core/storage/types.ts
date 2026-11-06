import type { InferenceResult } from '@/core/inference/types';
export type AbcdeCriterion = 'A' | 'B' | 'C' | 'D' | 'E';

export const CLINICAL_DURATIONS = ['lt1w', '1to4w', '1to6m', 'gt6m', 'unknown'] as const;
export type ClinicalDuration = (typeof CLINICAL_DURATIONS)[number];

export const CLINICAL_SYMPTOMS = ['itch', 'pain', 'bleeding', 'recentChange'] as const;
export type ClinicalSymptom = (typeof CLINICAL_SYMPTOMS)[number];

export const CLINICAL_AGE_MAX = 120;
export const CLINICAL_HISTORY_MAX = 500;

/**
 * Optional context typed by the user. Stays on the device, is never interpreted
 * by the model and never feeds a score. Every field is optional.
 */
export interface ClinicalContext {
  ageYears?: number;
  duration?: ClinicalDuration;
  symptoms?: ClinicalSymptom[];
  history?: string;
}

export interface ExamRecord {
  id: string;
  createdAt: string;
  bodySite: string | null;
  /** Unanswered criteria are absent: render as "Sin evaluar". */
  abcde: Partial<Record<AbcdeCriterion, string>>;
  note: string;
  priorImageId: string | null;
  lastExport: { at: string; format: 'json' | 'pdf'; registryVersion: number } | null;
  registryVersion: number;
  /** User-supplied clinical context. Absent until the user saves it. */
  clinicalContext?: ClinicalContext;
}

export type ImageOrigin = 'camera' | 'file' | 'sample';

export interface StoredImage {
  /** Viewer bytes with the EXIF APP1 segment (and therefore GPS) removed. */
  original: Blob;
  /** Upload copy, EXIF location removed. */
  upload: Blob;
  name: string;
  origin: ImageOrigin;
}

export const EXAM_SCHEMA_VERSION = 1;

export interface StoredExam {
  schemaVersion: typeof EXAM_SCHEMA_VERSION;
  record: ExamRecord;
  image: StoredImage | null;
  /** Last experimental model output (raw scores, source label). Absent in records saved before it existed. */
  result?: InferenceResult | null;
}

/** Persistence port. Implementations: IndexedDB (idb) and an in-memory fallback. */
export interface ExamStorageAdapter {
  load(): Promise<StoredExam | null>;
  save(snapshot: StoredExam): Promise<void>;
  clear(): Promise<void>;
}
