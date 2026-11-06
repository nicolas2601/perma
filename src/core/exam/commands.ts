import type { RecoveryScenario } from '@/core/inference/types';
import type { ExamEvent } from './contract';

export type RecoveryMode = 'back' | 'retry';

/**
 * Commands the architecture needs beyond the contract's ExamEvent union
 * (design/architecture.md section 3). The contract stays untouched; the store
 * accepts ExamEvent and these.
 */
export type ExamFlowCommand =
  | { type: 'START_CAPTURE' }
  | { type: 'CONFIRM_IMAGE' }
  | { type: 'BACK' }
  | { type: 'OPEN_INSPECT' }
  | { type: 'OPEN_ABCDE' }
  | { type: 'OPEN_COMPARE' }
  | { type: 'OPEN_EXPORT' }
  | { type: 'FAULT'; scenario: RecoveryScenario }
  | { type: 'DISCARD_RECORD' }
  | { type: 'NEW_RECORD' };

/** Contract RECOVER has no mode; a missing mode means "back" (design section 3). */
export interface RecoverCommand {
  type: 'RECOVER';
  scenario: RecoveryScenario;
  mode?: RecoveryMode;
}

export type ExamCommand = ExamEvent | ExamFlowCommand | RecoverCommand;
