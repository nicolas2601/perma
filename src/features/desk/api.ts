/**
 * Feature adapter (Features-A lane). Stands in for the core stores and i18n until
 * they land on develop: `useExam`, `useExamDispatch`, `useT`. Swap the bodies only.
 */
import { useEffect } from 'react';
import type { FeatureCopy } from '@/core/i18n/contract';
import { useExamStore, type ExamDomain, type LocalExamEvent } from './examStore';
import { useNavigate } from '@/app/router';

export function useExam<T>(selector: (state: ExamDomain) => T): T {
  return useExamStore(selector);
}

export function useExamDispatch(): (event: LocalExamEvent) => void {
  return useExamStore((state) => state.dispatch);
}

/** Typed lookup over a {es,en} copy table; both locales must share the same keys. */
export function useT<K extends string>(copy: { readonly es: Record<K, string>; readonly en: Record<K, string> }) {
  const locale = useExam((state) => state.locale);
  const table = copy[locale];
  return (key: K): string => table[key];
}

export type { FeatureCopy };

/** Redirects to a legal route when the required state is absent (G10). */
export function useGuard(allowed: boolean, fallbackPath: string): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (!allowed) navigate(fallbackPath, { replace: true });
  }, [allowed, fallbackPath, navigate]);
}
