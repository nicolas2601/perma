import type { AbcdeCriterion } from '@/core/storage/types';
import { CRITERIA } from './logic';

/** Reads `?criterio=a..e` (case-insensitive). Anything else yields null and the page stays collapsed. */
export function parseCriterionParam(raw: string | null): AbcdeCriterion | null {
  if (raw === null) return null;
  const upper = raw.trim().toUpperCase();
  return (CRITERIA as readonly string[]).includes(upper) ? (upper as AbcdeCriterion) : null;
}

export function accordionValue(criterion: AbcdeCriterion): string {
  return `criterion-${criterion.toLowerCase()}`;
}

export function rowId(criterion: AbcdeCriterion): string {
  return `abcde-${criterion.toLowerCase()}`;
}
