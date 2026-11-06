import { useEffect } from 'react';
import type { InferenceResult } from '@/core/inference/types';
import { useExam } from '@/core/exam/react';
import { useNavigate } from '@/app/router';

/** Architecture G10: a route whose required state is absent redirects to the nearest legal route. */
export const NO_RESULT_REDIRECT = '/imagen';

/** Returns the stored result, or null while redirecting away when none exists. */
export function useResultGuard(): InferenceResult | null {
  const result = useExam((state) => state.result);
  const navigate = useNavigate();
  useEffect(() => {
    if (!result) navigate(NO_RESULT_REDIRECT, { replace: true });
  }, [result, navigate]);
  return result;
}
