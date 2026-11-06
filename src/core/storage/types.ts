export type AbcdeCriterion = 'A' | 'B' | 'C' | 'D' | 'E';

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
}

/** Persistence port. Implementations: IndexedDB (idb) and an in-memory fallback. */
export interface ExamStorageAdapter {
  load(): Promise<StoredExam | null>;
  save(snapshot: StoredExam): Promise<void>;
  clear(): Promise<void>;
}
