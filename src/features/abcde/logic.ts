import type { AbcdeCriterion, ExamRecord } from '@/core/storage/types';

/** Ordered criteria. Free order of answering is allowed; display order is fixed. */
export const CRITERIA: readonly AbcdeCriterion[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * Option values per criterion (17 in total, from Figma frames 141:3252..141:3413).
 * Unanswered criteria are ABSENT from the record and render as "Sin evaluar".
 * "not-evaluable" is an explicit answer distinct from unanswered.
 * Writes go through the exam reducer (ABCDE_SET); this module only reads and lists.
 */
export const ABCDE_OPTIONS: Readonly<Record<AbcdeCriterion, readonly string[]>> = {
  A: ['symmetric', 'asymmetric-one-axis', 'asymmetric-two-axes', 'not-evaluable'],
  B: ['regular', 'irregular', 'not-evaluable'],
  C: ['one-color', 'two-colors', 'three-or-more-colors', 'not-evaluable'],
  D: ['over-6mm-manual', 'up-to-6mm-manual', 'no-physical-measure'],
  E: ['change-reported', 'no-change-reported', 'not-evaluable'],
};

export function countOptions(): number {
  return CRITERIA.reduce((total, criterion) => total + ABCDE_OPTIONS[criterion].length, 0);
}

export function isOptionOf(criterion: AbcdeCriterion, value: string): boolean {
  return ABCDE_OPTIONS[criterion].includes(value);
}

/** Current answer for a criterion, or null when unanswered. */
export function criterionValue(record: ExamRecord, criterion: AbcdeCriterion): string | null {
  return record.abcde[criterion] ?? null;
}

export function answeredCount(record: ExamRecord): number {
  return CRITERIA.filter((criterion) => criterionValue(record, criterion) !== null).length;
}
