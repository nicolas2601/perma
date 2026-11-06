import { describe, expect, it } from 'vitest';
import type { ExamState } from '@/core/exam/contract';
import { createInitialState, isAckValid } from '@/core/exam/state';
import { buildFilename } from '@/core/export/exportRecord';
import { fixedClock, makeImage, makeResult, run } from '../exam/fixtures';

const clock = fixedClock();

/** Reaches `exporting` through the real reducer: idle -> result -> compare -> summary. */
function toExporting(): ExamState {
  return run(
    createInitialState(clock),
    clock,
    { type: 'SET_SITE', site: 'face' },
    { type: 'START_CAPTURE' },
    { type: 'IMAGE_LOADED', image: makeImage({ origin: 'sample' }) },
    { type: 'CONFIRM_IMAGE' },
    { type: 'CONSENT', value: true },
    { type: 'SEND' },
    { type: 'RESULT_OK', result: makeResult('mock') },
    { type: 'OPEN_INSPECT' },
    { type: 'OPEN_ABCDE' },
    { type: 'OPEN_COMPARE' },
    { type: 'OPEN_EXPORT' },
  );
}

/** Export acknowledgement through the real reducer: ack is current only for the record it was given for. */
describe('export acknowledgement', () => {
  it('is not current before any export', () => {
    expect(isAckValid(toExporting())).toBe(false);
  });

  it('becomes current after ACK_EXPORT and stays current through a no-op ABCDE edit', () => {
    let state = run(toExporting(), clock, { type: 'ACK_EXPORT', format: 'json' });
    expect(state.phase).toBe('exported');
    expect(isAckValid(state)).toBe(true);
    state = run(state, clock, { type: 'ABCDE_SET', criterion: 'A', value: null });
    expect(isAckValid(state)).toBe(true);
  });

  it('is invalidated by a real ABCDE change', () => {
    const state = run(
      toExporting(),
      clock,
      { type: 'ACK_EXPORT', format: 'pdf' },
      { type: 'ABCDE_SET', criterion: 'B', value: 'regular' },
    );
    expect(isAckValid(state)).toBe(false);
  });

  it('is invalidated by a note change, but not by re-saving the same note', () => {
    let state = run(toExporting(), clock, { type: 'ACK_EXPORT', format: 'json' });
    state = run(state, clock, { type: 'NOTE_SET', note: '' });
    expect(isAckValid(state)).toBe(true);
    state = run(state, clock, { type: 'NOTE_SET', note: 'Revisión de control' });
    expect(isAckValid(state)).toBe(false);
  });

  it('is never recorded outside the exporting phase', () => {
    const idle = createInitialState(clock);
    const state = run(idle, clock, { type: 'ACK_EXPORT', format: 'json' });
    expect(state.phase).toBe('idle');
    expect(isAckValid(state)).toBe(false);
  });
});

describe('export file name', () => {
  it('uses the record id prefix and the export date for both formats', () => {
    const at = new Date('2026-11-05T12:00:00.000Z');
    expect(buildFilename('rec-1', at, 'json')).toBe('perma-rec1-2026-11-05.json');
    expect(buildFilename('rec-1', at, 'pdf')).toBe('perma-rec1-2026-11-05.pdf');
  });
});
