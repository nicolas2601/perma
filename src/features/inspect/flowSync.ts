import { useEffect } from 'react';
import type { ExamCommand } from '@/core/exam/commands';
import type { ExamPhase } from '@/core/exam/contract';
import { useExam, useExamDispatch } from '@/core/exam/react';

/**
 * Lane order of the review phases. Forward steps and back steps mirror the reducer
 * tables (FORWARD_TRANSITION, BACK_TARGET), so each command is one legal transition.
 */
const LANE_ORDER: readonly ExamPhase[] = ['result', 'inspecting', 'abcde', 'compare', 'exporting'];

const FORWARD_COMMAND: Partial<Record<ExamPhase, ExamCommand>> = {
  result: { type: 'OPEN_INSPECT' },
  inspecting: { type: 'OPEN_ABCDE' },
  abcde: { type: 'OPEN_COMPARE' },
  compare: { type: 'OPEN_EXPORT' },
};

/**
 * Next legal command toward `target`, or null when no step is needed or possible.
 * `exported` is terminal for the reducer (no path back to `exporting`), so it stops here.
 */
export function stepToward(current: ExamPhase, target: ExamPhase): ExamCommand | null {
  if (current === target || current === 'exported') return null;
  const from = LANE_ORDER.indexOf(current);
  const to = LANE_ORDER.indexOf(target);
  if (from === -1 || to === -1) return null;
  if (from > to) return { type: 'BACK' };
  return FORWARD_COMMAND[current] ?? null;
}

/**
 * Keeps the exam phase in step with the screen that is shown. Phase-gated commands
 * (ABCDE_SET, NOTE_SET, ACK_EXPORT) are ignored by the reducer outside their phase,
 * so a screen first moves the phase with legal steps instead of losing the edit.
 */
export function useFlowSync(target: ExamPhase): void {
  const phase = useExam((state) => state.phase);
  const dispatch = useExamDispatch();
  useEffect(() => {
    const command = stepToward(phase, target);
    if (command) dispatch(command);
  }, [phase, target, dispatch]);
}
