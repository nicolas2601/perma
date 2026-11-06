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
