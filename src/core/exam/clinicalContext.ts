import {
  CLINICAL_SYMPTOMS,
  type ClinicalContext,
  type ClinicalDuration,
  type ClinicalSymptom,
} from '@/core/storage/types';

/** Copy lookup for full keys (for example `desk.ctxAge`). Callers use `useT('')` or a registry translate. */
export type ClinicalTranslate = (key: string) => string;

const NAMESPACE = 'desk';
const SUMMARY_SEPARATOR = ' · ';
const LIST_SEPARATOR = ', ';

/** Copy keys inside the desk namespace (src/features/desk/copy.ts). */
export const CLINICAL_COPY = {
  notRecorded: 'ctxNotRegistered',
  age: 'ctxAge',
  durationTitle: 'ctxDurationTitle',
  symptomsTitle: 'ctxSymptomsTitle',
  historyTitle: 'ctxHistoryTitle',
  historyRecorded: 'ctxHistoryRecorded',
  symptomOne: 'ctxSymptomsOne',
  symptomMany: 'ctxSymptomsMany',
} as const;

export const DURATION_COPY: Record<ClinicalDuration, string> = {
  lt1w: 'ctxDurationLt1w',
  '1to4w': 'ctxDuration1to4w',
  '1to6m': 'ctxDuration1to6m',
  gt6m: 'ctxDurationGt6m',
  unknown: 'ctxDurationUnknown',
};

export const SYMPTOM_COPY: Record<ClinicalSymptom, string> = {
  itch: 'ctxSymptomItch',
  pain: 'ctxSymptomPain',
  bleeding: 'ctxSymptomBleeding',
  recentChange: 'ctxSymptomRecentChange',
};

/**
 * Trims free text, drops empty fields and orders symptoms canonically, so the same
 * content always compares equal. Returns undefined when nothing is left.
 */
export function normalizeClinicalContext(input: ClinicalContext): ClinicalContext | undefined {
  const normalized: ClinicalContext = {};
  if (input.ageYears !== undefined) normalized.ageYears = input.ageYears;
  if (input.duration !== undefined) normalized.duration = input.duration;
  const symptoms = CLINICAL_SYMPTOMS.filter((symptom) => input.symptoms?.includes(symptom) === true);
  if (symptoms.length > 0) normalized.symptoms = symptoms;
  const history = input.history?.trim() ?? '';
  if (history !== '') normalized.history = history;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/** One line for the Context row and the review summary, e.g. "Edad 54 · 1-6 meses · 2 síntomas". */
export function clinicalContextSummary(context: ClinicalContext | undefined, t: ClinicalTranslate): string {
  const normalized = context === undefined ? undefined : normalizeClinicalContext(context);
  if (normalized === undefined) return t(qualified(CLINICAL_COPY.notRecorded));
  const parts: string[] = [];
  if (normalized.ageYears !== undefined) parts.push(`${t(qualified(CLINICAL_COPY.age))} ${normalized.ageYears}`);
  if (normalized.duration !== undefined) parts.push(t(qualified(DURATION_COPY[normalized.duration])));
  if (normalized.symptoms !== undefined) parts.push(symptomsCountText(normalized.symptoms.length, t));
  if (normalized.history !== undefined) parts.push(t(qualified(CLINICAL_COPY.historyRecorded)));
  return parts.join(SUMMARY_SEPARATOR);
}

/** Labelled lines for the printable export and the review: "Edad: 54", "Síntomas: Picazón, Dolor". */
export function clinicalContextLines(context: ClinicalContext | undefined, t: ClinicalTranslate): string[] {
  const normalized = context === undefined ? undefined : normalizeClinicalContext(context);
  if (normalized === undefined) return [t(qualified(CLINICAL_COPY.notRecorded))];
  const lines: string[] = [];
  if (normalized.ageYears !== undefined) lines.push(labelled(CLINICAL_COPY.age, String(normalized.ageYears), t));
  if (normalized.duration !== undefined) {
    lines.push(labelled(CLINICAL_COPY.durationTitle, t(qualified(DURATION_COPY[normalized.duration])), t));
  }
  if (normalized.symptoms !== undefined) {
    const names = normalized.symptoms.map((symptom) => t(qualified(SYMPTOM_COPY[symptom])));
    lines.push(labelled(CLINICAL_COPY.symptomsTitle, names.join(LIST_SEPARATOR), t));
  }
  if (normalized.history !== undefined) lines.push(labelled(CLINICAL_COPY.historyTitle, normalized.history, t));
  return lines;
}

function labelled(labelKey: string, value: string, t: ClinicalTranslate): string {
  return `${t(qualified(labelKey))}: ${value}`;
}

function symptomsCountText(count: number, t: ClinicalTranslate): string {
  if (count === 1) return t(qualified(CLINICAL_COPY.symptomOne));
  return t(qualified(CLINICAL_COPY.symptomMany)).replace('{n}', String(count));
}

/** Namespaced key in the desk copy table. */
export function qualified(key: string): string {
  return `${NAMESPACE}.${key}`;
}
