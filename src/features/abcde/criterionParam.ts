import type { AbcdeCriterion } from '@/core/storage/types';
import { CRITERIA } from './logic';

/** `?criterio=a..e` (case-insensitive). Anything else is ignored at the edge. */
export function parseCriterionParam(raw: string | null): AbcdeCriterion | null {
  if (raw === null) return null;
  const upper = raw.toUpperCase();
  return (CRITERIA as readonly string[]).includes(upper) ? (upper as AbcdeCriterion) : null;
}

/** DOM id of one criterion row, used for scroll-to-criterion. */
export function rowId(criterion: AbcdeCriterion): string {
  return `abcde-${criterion.toLowerCase()}`;
}
