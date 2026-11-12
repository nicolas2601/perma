import type { RecoveryScenario } from '@/core/inference/types';
import type { ExamPhase } from './contract';
import type { RecoveryMode } from './commands';

/** Architecture section 3: user "back" transitions. exported->idle is NOT here (new record only). */
export const BACK_TARGET: Partial<Record<ExamPhase, ExamPhase>> = {
  contextSet: 'idle',
  capturing: 'contextSet',
  reviewing: 'capturing',
  consenting: 'reviewing',
  result: 'idle',
  inspecting: 'result',
  abcde: 'inspecting',
  compare: 'abcde',
  exporting: 'compare',
};

/** Forward navigation commands: command type -> [from, to]. */
export const FORWARD_TRANSITION = {
  OPEN_INSPECT: ['result', 'inspecting'],
  OPEN_ABCDE: ['inspecting', 'abcde'],
  OPEN_COMPARE: ['abcde', 'compare'],
  OPEN_EXPORT: ['compare', 'exporting'],
} as const satisfies Record<string, readonly [ExamPhase, ExamPhase]>;

/** Phases from which each recovery scenario may be entered (architecture section 3). */
export const FAULT_SOURCES: Record<RecoveryScenario, readonly ExamPhase[]> = {
  permission: ['capturing'],
  'file-unavailable': ['capturing', 'reviewing'],
  offline: ['consenting', 'processing'],
  'server-error': ['processing'],
  timeout: ['processing'],
  'invalid-response': ['processing'],
  'rate-limit': ['processing'],
  'export-unavailable': ['exporting'],
};

/** Return targets per recovery scenario. Static table: the "returnTo" context is derived from the scenario. */
export const RECOVERY_TARGET: Record<RecoveryScenario, Record<RecoveryMode, ExamPhase>> = {
  permission: { back: 'capturing', retry: 'capturing' },
  'file-unavailable': { back: 'capturing', retry: 'capturing' },
  offline: { back: 'reviewing', retry: 'consenting' },
  'server-error': { back: 'reviewing', retry: 'consenting' },
  timeout: { back: 'reviewing', retry: 'consenting' },
  'invalid-response': { back: 'reviewing', retry: 'consenting' },
  'rate-limit': { back: 'reviewing', retry: 'consenting' },
  'export-unavailable': { back: 'compare', retry: 'exporting' },
};

export function recoveryPhase(scenario: RecoveryScenario): ExamPhase {
  return `recover:${scenario}` as ExamPhase;
}
