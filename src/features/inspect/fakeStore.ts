import type { ExamEvent, ExamState } from '@/core/exam/contract';
import type { ClassCode, InferenceResult } from '@/core/inference/types';
import type { ExamRecord } from '@/core/storage/types';
import { setCriterion } from '@/features/abcde/logic';

/**
 * LOCAL FAKE of the exam store (owned by the state squad). Used until `useExam` /
 * `useExamDispatch` ship. Mock output is labelled source "mock" (Modelo simulado)
 * and is never exported as a real result. Values are synthetic and sum to 1.
 */
export const MOCK_SCORES: Readonly<Record<ClassCode, number>> = {
  nv: 0.61,
  bkl: 0.15,
  mel: 0.09,
  bcc: 0.06,
  akiec: 0.04,
  vasc: 0.03,
  df: 0.02,
};

export function mockResult(): InferenceResult {
  return {
    source: 'mock',
    model: 'B71',
    mode: 'base',
    identity: { modelId: 'B71 (simulado)', sha256: null, sha256Verified: null, recipe: null, release: null },
    scores: { ...MOCK_SCORES },
    latencyMs: 0,
    warnings: [],
  };
}

export function emptyRecord(now: string = new Date().toISOString()): ExamRecord {
  return {
    id: 'local-session',
    createdAt: now,
    bodySite: null,
    abcde: {},
    note: '',
    priorImageId: null,
    lastExport: null,
    registryVersion: 0,
  };
}

export function initialExamState(seedMock: boolean): ExamState {
  return {
    phase: seedMock ? 'result' : 'idle',
    record: emptyRecord(),
    image: null,
    result: seedMock ? mockResult() : null,
    consented: false,
    ackRegistryVersion: null,
  };
}

/** Reducer for the events this lane dispatches. Other events are ignored by the fake. */
export function reduceExam(state: ExamState, event: ExamEvent): ExamState {
  switch (event.type) {
    case 'ABCDE_SET':
      return { ...state, record: setCriterion(state.record, event.criterion, event.value) };
    case 'NOTE_SET': {
      if (state.record.note === event.note) return state;
      return {
        ...state,
        record: { ...state.record, note: event.note, registryVersion: state.record.registryVersion + 1 },
      };
    }
    case 'ACK_EXPORT':
      return {
        ...state,
        phase: 'exported',
        ackRegistryVersion: state.record.registryVersion,
        record: {
          ...state.record,
          lastExport: {
            at: new Date().toISOString(),
            format: event.format,
            registryVersion: state.record.registryVersion,
          },
        },
      };
    case 'RESET':
      return initialExamState(false);
    default:
      return state;
  }
}
