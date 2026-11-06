import { CLINICAL_AGE_MAX, type ClinicalContext, type ClinicalDuration, type ClinicalSymptom } from '@/core/storage/types';

/** Form state while the sheet is open. Age stays text until it is validated. */
export interface ClinicalDraft {
  age: string;
  duration: ClinicalDuration | null;
  symptoms: ClinicalSymptom[];
  history: string;
}

const EMPTY_AGE = '';

/** Empty means "not provided". Otherwise a whole number from 0 to CLINICAL_AGE_MAX. */
export function isAgeDraftValid(text: string): boolean {
  if (text === EMPTY_AGE) return true;
  if (!/^\d+$/.test(text)) return false;
  const value = Number(text);
  return Number.isSafeInteger(value) && value <= CLINICAL_AGE_MAX;
}

export function draftFromContext(context: ClinicalContext | undefined): ClinicalDraft {
  return {
    age: context?.ageYears === undefined ? EMPTY_AGE : String(context.ageYears),
    duration: context?.duration ?? null,
    symptoms: context?.symptoms ?? [],
    history: context?.history ?? '',
  };
}

/** Only fields the user filled in. Invalid age must be rejected by the caller first. */
export function contextFromDraft(draft: ClinicalDraft): ClinicalContext {
  const context: ClinicalContext = {};
  if (draft.age !== EMPTY_AGE) context.ageYears = Number(draft.age);
  if (draft.duration !== null) context.duration = draft.duration;
  if (draft.symptoms.length > 0) context.symptoms = [...draft.symptoms];
  if (draft.history.trim() !== '') context.history = draft.history;
  return context;
}

/** Toggles a symptom chip, keeping the list free of duplicates. */
export function toggleSymptom(symptoms: ClinicalSymptom[], symptom: ClinicalSymptom): ClinicalSymptom[] {
  return symptoms.includes(symptom) ? symptoms.filter((item) => item !== symptom) : [...symptoms, symptom];
}
