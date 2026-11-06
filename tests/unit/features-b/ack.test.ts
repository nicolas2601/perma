import { describe, expect, it } from 'vitest';
import { canRecordAck, isAckCurrent } from '@/features/review/ack';
import { buildExportPayload, exportFileName } from '@/features/review/exportRecord';
import { initialExamState, mockResult, reduceExam } from '@/features/inspect/fakeStore';

/** Export ack flow with the local fake reducer: ack, then edits invalidate it. */
describe('export acknowledgement', () => {
  it('is not current before any export', () => {
    const state = initialExamState(true);
    expect(isAckCurrent(state.ackRegistryVersion, state.record)).toBe(false);
  });

  it('becomes current after ACK_EXPORT and stays current through no-op edits', () => {
    let state = reduceExam(initialExamState(true), { type: 'ACK_EXPORT', format: 'json' });
    expect(isAckCurrent(state.ackRegistryVersion, state.record)).toBe(true);
    state = reduceExam(state, { type: 'ABCDE_SET', criterion: 'A', value: null });
    expect(isAckCurrent(state.ackRegistryVersion, state.record)).toBe(true);
  });

  it('is invalidated by an ABCDE change', () => {
    let state = reduceExam(initialExamState(true), { type: 'ACK_EXPORT', format: 'json' });
    state = reduceExam(state, { type: 'ABCDE_SET', criterion: 'B', value: 'regular' });
    expect(isAckCurrent(state.ackRegistryVersion, state.record)).toBe(false);
  });

  it('is invalidated by a note change, but not by re-saving the same note', () => {
    let state = reduceExam(initialExamState(true), { type: 'ACK_EXPORT', format: 'json' });
    state = reduceExam(state, { type: 'NOTE_SET', note: '' });
    expect(isAckCurrent(state.ackRegistryVersion, state.record)).toBe(true);
    state = reduceExam(state, { type: 'NOTE_SET', note: 'Revisión de control' });
    expect(isAckCurrent(state.ackRegistryVersion, state.record)).toBe(false);
  });

  it('is never recorded for a download that did not start', () => {
    expect(canRecordAck(false)).toBe(false);
    expect(canRecordAck(true)).toBe(true);
  });
});

describe('export payload', () => {
  it('makes unanswered criteria explicit and labels simulated output', () => {
    const payload = buildExportPayload(initialExamState(true).record, mockResult());
    expect(payload.manualObservations).toEqual({ A: 'unanswered', B: 'unanswered', C: 'unanswered', D: 'unanswered', E: 'unanswered' });
    expect(payload.modelOutput?.simulated).toBe(true);
    expect(payload.modelOutput?.label).toBe('Modelo simulado');
  });

  it('builds a file name from the record timestamp', () => {
    const record = { ...initialExamState(false).record, createdAt: '2026-11-05T10:20:30.000Z' };
    expect(exportFileName(record)).toBe('perma-registro-20261105102030.json');
  });
});
