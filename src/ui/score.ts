export const SCORE_MIN = 0;
export const SCORE_MAX = 1;

export class InvalidScoreError extends Error {
  readonly code = 'INVALID_SCORE';

  constructor(readonly received: unknown) {
    super(`Raw score must be a finite number in [${SCORE_MIN}, ${SCORE_MAX}]; received ${String(received)}`);
    this.name = 'InvalidScoreError';
  }
}

/** Validates a raw model score at the UI edge. Scores are never converted to percentages. */
export function toRawScore(value: number): number {
  if (!Number.isFinite(value) || value < SCORE_MIN || value > SCORE_MAX) {
    throw new InvalidScoreError(value);
  }
  return value;
}
