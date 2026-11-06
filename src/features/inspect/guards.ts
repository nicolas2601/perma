import { useEffect } from 'react';
import type { InferenceResult } from '@/core/inference/types';
import { useNavigate } from '@/app/router';
import { useExam } from './api';

/** Architecture G10: a route whose required state is absent redirects to the nearest legal route. */
export const NO_RESULT_REDIRECT = '/imagen';

/** Returns the current result, or null while redirecting away when none exists. */
export function useResultGuard(): InferenceResult | null {
  const result = useExam().result;
  const navigate = useNavigate();
  useEffect(() => {
    if (!result) navigate(NO_RESULT_REDIRECT, { replace: true });
  }, [result, navigate]);
  return result;
}
