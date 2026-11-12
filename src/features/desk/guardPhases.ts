import type { ExamPhase } from '@/core/exam/contract';

/**
 * Phases in which each stage page may still be mounted. A page re-renders with the phase
 * its own action just produced before the router unmounts it (the store update and the
 * route change are not one commit), so the sets include the phases a page hands off to.
 * Reloads derive a phase from storage (core hydration) and the guard then redirects (G10).
 */
export const CAPTURE_STAGE_PHASES: ReadonlySet<ExamPhase> = new Set<ExamPhase>([
  'contextSet',
  'capturing',
  'reviewing',
  'recover:file-unavailable',
  'recover:permission',
]);

export const CONSENT_STAGE_PHASES: ReadonlySet<ExamPhase> = new Set<ExamPhase>([
  'consenting',
  'processing',
  'recover:offline',
]);

export const PROCESSING_STAGE_PHASES: ReadonlySet<ExamPhase> = new Set<ExamPhase>([
  'processing',
  'result',
  'recover:offline',
  'recover:server-error',
  'recover:timeout',
  'recover:invalid-response',
  'recover:rate-limit',
]);
