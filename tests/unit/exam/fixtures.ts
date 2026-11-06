import type { ExamClock } from '@/core/exam/clock';
import type { ExamImage } from '@/core/exam/contract';
import { CLASS_CODES, type ClassCode, type InferenceResult } from '@/core/inference/types';
import type { ExamCommand } from '@/core/exam/commands';
import type { ExamState } from '@/core/exam/contract';
import { examReducer } from '@/core/exam/reducer';

export const FIXED_NOW = '2026-11-05T12:00:00.000Z';

export function fixedClock(): ExamClock {
  let counter = 0;
  return { now: () => FIXED_NOW, newId: () => `rec-${++counter}` };
}

export function makeImage(overrides: Partial<ExamImage> = {}): ExamImage {
  return {
    original: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
    upload: new Blob([new Uint8Array([4, 5, 6])], { type: 'image/jpeg' }),
    name: 'lesion.jpg',
    origin: 'file',
    ...overrides,
  };
}

export function makeResult(source: InferenceResult['source'] = 'live'): InferenceResult {
  const scores = Object.fromEntries(CLASS_CODES.map((code) => [code, 0.1])) as Record<ClassCode, number>;
  return {
    source,
    model: 'A71',
    mode: 'base',
    identity: { modelId: 'A71', sha256: null, sha256Verified: null, recipe: null, release: null },
    scores,
    latencyMs: 120,
    warnings: [],
  };
}

/** Applies commands in order with a fixed clock. */
export function run(state: ExamState, clock: ExamClock, ...commands: ExamCommand[]): ExamState {
  return commands.reduce((current, command) => examReducer(current, command, clock), state);
}
