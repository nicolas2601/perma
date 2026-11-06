import type { RecoveryScenario } from '@/core/inference/types';
import type { ExamState } from './contract';
import type { RecoveryMode } from './commands';
import { changeImage } from './content';
import { withPhase } from './flow';
import { FAULT_SOURCES, RECOVERY_TARGET, recoveryPhase } from './tables';

/** Enters a recovery state from a legal phase. The record is never touched. */
export function fault(state: ExamState, scenario: RecoveryScenario): ExamState {
  if (!FAULT_SOURCES[scenario].includes(state.phase)) return state;
  return withPhase(state, recoveryPhase(scenario));
}

/**
 * Leaves a recovery state. Re-picking a file (or returning to capture) discards
 * the image, as reviewing -> capturing does; other targets keep the record.
 */
export function recover(
  state: ExamState,
  scenario: RecoveryScenario,
  mode: RecoveryMode = 'back',
): ExamState {
  if (state.phase !== recoveryPhase(scenario)) return state;
  const target = RECOVERY_TARGET[scenario][mode];
  const base = target === 'capturing' ? changeImage(state, null) : state;
  return withPhase(base, target);
}
