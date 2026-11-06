import { create } from 'zustand';
import type { ExamImage } from '@/core/exam/contract';
import type { Locale } from '@/core/i18n/contract';
import type { InferenceResult, RecoveryScenario } from '@/core/inference/types';

/**
 * Local stand-in for the core exam store (not yet on develop). Shape mirrors
 * `ExamState` in src/core/exam/contract.ts; event names mirror `ExamEvent` where they overlap.
 */
export interface ExamDomain {
  locale: Locale;
  bodySite: string | null;
  contextSaved: boolean;
  image: ExamImage | null;
  consented: boolean;
  result: InferenceResult | null;
  failure: RecoveryScenario | null;
}

export type LocalExamEvent =
  | { type: 'SET_LOCALE'; locale: Locale }
  | { type: 'SET_SITE'; site: string | null }
  | { type: 'CONTEXT_SAVED' }
  | { type: 'IMAGE_LOADED'; image: ExamImage }
  | { type: 'IMAGE_DISCARDED' }
  | { type: 'CONSENT'; value: boolean }
  | { type: 'RESULT_OK'; result: InferenceResult }
  | { type: 'FAILED'; scenario: RecoveryScenario }
  | { type: 'CLEAR_FAILURE' }
  | { type: 'DISCARD_RECORD' };

export const INITIAL_EXAM: ExamDomain = {
  locale: 'es',
  bodySite: null,
  contextSaved: false,
  image: null,
  consented: false,
  result: null,
  failure: null,
};

/** Pure transition function. Locale never clears the record or consent (G6). */
export function reduceExam(state: ExamDomain, event: LocalExamEvent): ExamDomain {
  switch (event.type) {
    case 'SET_LOCALE':
      return { ...state, locale: event.locale };
    case 'SET_SITE':
      return { ...state, bodySite: event.site };
    case 'CONTEXT_SAVED':
      return { ...state, contextSaved: true };
    case 'IMAGE_LOADED':
      return { ...state, image: event.image, consented: false, result: null, failure: null };
    case 'IMAGE_DISCARDED':
      return { ...state, image: null, consented: false, result: null };
    case 'CONSENT':
      return { ...state, consented: event.value };
    case 'RESULT_OK':
      return { ...state, result: event.result, failure: null };
    case 'FAILED':
      return { ...state, failure: event.scenario, result: null };
    case 'CLEAR_FAILURE':
      return { ...state, failure: null };
    case 'DISCARD_RECORD':
      return { ...INITIAL_EXAM, locale: state.locale };
  }
}

export interface ExamStore extends ExamDomain {
  dispatch: (event: LocalExamEvent) => void;
}

export const useExamStore = create<ExamStore>()((set) => ({
  ...INITIAL_EXAM,
  dispatch: (event) => set((state) => reduceExam(state, event)),
}));
