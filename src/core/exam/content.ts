import type { ExamRecord } from '@/core/storage/types';
import type { ExamImage, ExamState } from './contract';
import { normalizeClinicalContext } from './clinicalContext';

/** Fields that count as record content. Language, consent and lastExport are excluded on purpose. */
function canonicalContent(record: ExamRecord): string {
  const abcde = Object.fromEntries(Object.entries(record.abcde).sort(([a], [b]) => a.localeCompare(b)));
  const clinical = record.clinicalContext === undefined ? null : normalizeClinicalContext(record.clinicalContext) ?? null;
  return JSON.stringify({
    bodySite: record.bodySite,
    abcde,
    note: record.note,
    priorImageId: record.priorImageId,
    clinicalContext: clinical,
  });
}

/** True when the record holds anything the user typed or captured (drives the Home delete action). */
export function hasRecordContent(state: ExamState): boolean {
  const { record } = state;
  return (
    state.image !== null ||
    record.bodySite !== null ||
    record.note.trim() !== '' ||
    Object.keys(record.abcde).length > 0 ||
    record.clinicalContext !== undefined ||
    record.priorImageId !== null
  );
}

export function sameContent(a: ExamRecord, b: ExamRecord): boolean {
  return canonicalContent(a) === canonicalContent(b);
}

/**
 * Applies a record patch. Bumps registryVersion and invalidates the ack only
 * when content actually changed (G5). A no-op patch returns the same state.
 */
export function changeRecord(state: ExamState, patch: Partial<ExamRecord>): ExamState {
  const next: ExamRecord = { ...state.record, ...patch };
  if (sameContent(state.record, next)) return state;
  return bumped(state, { ...next, registryVersion: state.record.registryVersion + 1 });
}

/** Replacing or removing the image is record content. It also drops the stale result and consent. */
export function changeImage(state: ExamState, image: ExamImage | null): ExamState {
  if (state.image === image) return state;
  const base = { ...state, image, result: null, consented: false };
  return bumped(base, { ...state.record, registryVersion: state.record.registryVersion + 1 });
}

function bumped(state: ExamState, record: ExamRecord): ExamState {
  return { ...state, record, ackRegistryVersion: null };
}
