/** Injected side effects (time, ids) so the reducer stays pure and testable. */
export interface ExamClock {
  now(): string;
  newId(): string;
}

export const systemClock: ExamClock = {
  now: () => new Date().toISOString(),
  newId: () => crypto.randomUUID(),
};
