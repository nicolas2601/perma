import type { ExamRecord } from '@/core/storage/types';
import type { ExamClock } from './clock';
import type { ExamImage, ExamState } from './contract';

export interface HydrationInput {
  record: ExamRecord;
  image: ExamImage | null;
}

export function createEmptyRecord(clock: ExamClock, registryVersion = 0): ExamRecord {
  return {
    id: clock.newId(),
    createdAt: clock.now(),
    bodySite: null,
    abcde: {},
    note: '',
    priorImageId: null,
    lastExport: null,
    registryVersion,
  };
}

export function createInitialState(clock: ExamClock, registryVersion = 0): ExamState {
  return {
    phase: 'idle',
    record: createEmptyRecord(clock, registryVersion),
    image: null,
    result: null,
    consented: false,
    ackRegistryVersion: null,
  };
}

/**
 * Restore after reload. Result is never persisted, so the phase is derived from
 * what survived: an image returns the user to review, a site to context.
 * The export acknowledgement survives only if it matches the restored version.
 */
export function createHydratedState(input: HydrationInput): ExamState {
  const { record, image } = input;
  const exportedVersion = record.lastExport?.registryVersion ?? null;
  return {
    phase: derivePhase(record, image),
    record,
    image,
    result: null,
    consented: false,
    ackRegistryVersion: exportedVersion === record.registryVersion ? record.registryVersion : null,
  };
}

function derivePhase(record: ExamRecord, image: ExamImage | null): ExamState['phase'] {
  if (image) return 'reviewing';
  return record.bodySite === null ? 'idle' : 'contextSet';
}

/** Ack is valid only while the record version it was issued for is still current. Never language-dependent. */
export function isAckValid(state: ExamState): boolean {
  return state.ackRegistryVersion !== null && state.ackRegistryVersion === state.record.registryVersion;
}
