import { useCallback, useSyncExternalStore } from 'react';
import type { ExamEvent, ExamState } from '@/core/exam/contract';
import type { Locale } from '@/core/i18n/contract';
import { initialExamState, reduceExam } from './fakeStore';

/**
 * ADAPTER LANE (features-B). Thin hooks over the contracts `useExam`, `useExamDispatch`
 * and `useT`. The state squad will replace the body of this module; feature code imports
 * only from here (and from the sibling `api.ts` re-exports), so the swap is one file.
 */

const SEED_MOCK = import.meta.env.VITE_INFERENCE === 'mock';

let examState: ExamState = initialExamState(SEED_MOCK);
const examListeners = new Set<() => void>();

function emitExam(): void {
  examListeners.forEach((listener) => listener());
}

function subscribeExam(listener: () => void): () => void {
  examListeners.add(listener);
  return () => examListeners.delete(listener);
}

/** Test/dev hook: replaces the fake store contents. */
export function resetFakeExamStore(seedMock: boolean): void {
  examState = initialExamState(seedMock);
  emitExam();
}

export function useExam(): ExamState {
  return useSyncExternalStore(subscribeExam, () => examState, () => examState);
}

export function useExamDispatch(): (event: ExamEvent) => void {
  return useCallback((event: ExamEvent) => {
    const next = reduceExam(examState, event);
    if (next === examState) return;
    examState = next;
    emitExam();
  }, []);
}

let currentLocale: Locale = 'es';
const localeListeners = new Set<() => void>();

function subscribeLocale(listener: () => void): () => void {
  localeListeners.add(listener);
  return () => localeListeners.delete(listener);
}

/** Language is UI state only: it never touches the exam record or the export ack. */
export function setLocale(next: Locale): void {
  if (next === currentLocale) return;
  currentLocale = next;
  localeListeners.forEach((listener) => listener());
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, () => currentLocale, () => currentLocale);
}

export type CopyTables<K extends string> = { readonly es: Record<K, string>; readonly en: Record<K, string> };

/** Translator for one feature's copy table (`src/features/<f>/copy.ts`). */
export function useT<K extends string>(table: CopyTables<K>): (key: K) => string {
  const locale = useLocale();
  return useCallback((key: K) => table[locale][key], [locale, table]);
}
