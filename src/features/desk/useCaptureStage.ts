import { useEffect } from 'react';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { CONTEXT_PATH } from './recoveryPaths';
import { CAPTURE_STAGE_PHASES } from './guardPhases';
import { useGuard } from './useGuard';

/**
 * Acquisition stages (source choice, live camera, sample gallery) run in phase `capturing`.
 * Entering from `contextSet` starts it; any phase outside the stage redirects to the context step (G10).
 */
export function useCaptureStage(): void {
  const phase = useExam((s) => s.phase);
  const dispatch = useExamDispatch();
  useEffect(() => {
    if (phase === 'contextSet') dispatch({ type: 'START_CAPTURE' });
  }, [phase, dispatch]);
  useGuard(CAPTURE_STAGE_PHASES.has(phase), CONTEXT_PATH);
}
