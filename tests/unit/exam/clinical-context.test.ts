import { describe, expect, it } from 'vitest';
import { examReducer } from '@/core/exam/reducer';
import { hasRecordContent } from '@/core/exam/content';
import { createInitialState, isAckValid } from '@/core/exam/state';
import type { ExamCommand } from '@/core/exam/commands';
import type { ExamState } from '@/core/exam/contract';
import type { ClinicalContext } from '@/core/storage/types';
import { FIXED_NOW, fixedClock, makeImage, makeResult, run } from './fixtures';

const clock = fixedClock();
const idle = () => createInitialState(clock);
const ctx: ClinicalContext = {
  ageYears: 54,
  duration: '1to6m',
  symptoms: ['pain', 'itch'],
  history: '  nevo congénito  ',
};

function apply(state: ExamState, ...commands: ExamCommand[]): ExamState {
  return run(state, clock, ...commands);
}

function atExported(): ExamState {
  return apply(
    idle(),
    { type: 'SET_SITE', site: 'antebrazo' },
    { type: 'START_CAPTURE' },
    { type: 'IMAGE_LOADED', image: makeImage() },
    { type: 'CONFIRM_IMAGE' },
    { type: 'CONSENT', value: true },
    { type: 'SEND' },
    { type: 'RESULT_OK', result: makeResult() },
    { type: 'OPEN_INSPECT' },
    { type: 'OPEN_ABCDE' },
    { type: 'OPEN_COMPARE' },
    { type: 'OPEN_EXPORT' },
    { type: 'ACK_EXPORT', format: 'json' },
  );
}

describe('clinical context in the exam reducer', () => {
  it('stores a normalized context and bumps the record version', () => {
    const before = idle();
    const after = apply(before, { type: 'SET_CLINICAL_CONTEXT', context: ctx });
    expect(after.record.clinicalContext).toEqual({
      ageYears: 54,
      duration: '1to6m',
      symptoms: ['itch', 'pain'],
      history: 'nevo congénito',
    });
    expect(after.record.registryVersion).toBe(before.record.registryVersion + 1);
  });

  it('keeps the same state when the saved content is unchanged, even with reordered symptoms', () => {
    const saved = apply(idle(), { type: 'SET_CLINICAL_CONTEXT', context: ctx });
    const again = apply(saved, { type: 'SET_CLINICAL_CONTEXT', context: { ...ctx, symptoms: ['itch', 'pain'] } });
    expect(again).toBe(saved);
  });

  it('ignores input that breaks the schema', () => {
    const before = idle();
    const tooOld = apply(before, { type: 'SET_CLINICAL_CONTEXT', context: { ageYears: 121 } });
    const unknownSymptom = apply(before, {
      type: 'SET_CLINICAL_CONTEXT',
      context: { symptoms: ['fever' as 'itch'] },
    });
    expect(tooOld).toBe(before);
    expect(unknownSymptom).toBe(before);
  });

  it('clears the context with null and bumps the version', () => {
    const saved = apply(idle(), { type: 'SET_CLINICAL_CONTEXT', context: ctx });
    const cleared = apply(saved, { type: 'SET_CLINICAL_CONTEXT', context: null });
    expect(cleared.record.clinicalContext).toBeUndefined();
    expect(cleared.record.registryVersion).toBe(saved.record.registryVersion + 1);
  });

  it('invalidates the export acknowledgement when the context changes after export', () => {
    const exported = atExported();
    expect(isAckValid(exported)).toBe(true);
    const edited = apply(exported, { type: 'SET_CLINICAL_CONTEXT', context: { ageYears: 40 } });
    expect(edited.phase).toBe('exported');
    expect(isAckValid(edited)).toBe(false);
  });

  it('does not accept a context while a request is in flight', () => {
    const processing = apply(
      idle(),
      { type: 'SET_SITE', site: 'antebrazo' },
      { type: 'START_CAPTURE' },
      { type: 'IMAGE_LOADED', image: makeImage() },
      { type: 'CONFIRM_IMAGE' },
      { type: 'CONSENT', value: true },
      { type: 'SEND' },
    );
    expect(processing.phase).toBe('processing');
    expect(apply(processing, { type: 'SET_CLINICAL_CONTEXT', context: ctx })).toBe(processing);
  });

  it('discard clears the context and invalidates the acknowledgement', () => {
    const exported = atExported();
    const withContext = apply(exported, { type: 'SET_CLINICAL_CONTEXT', context: ctx });
    const discarded = examReducer(withContext, { type: 'DISCARD_RECORD' }, clock);
    expect(discarded.record.clinicalContext).toBeUndefined();
    expect(discarded.phase).toBe('idle');
    expect(isAckValid(discarded)).toBe(false);
  });

  it('counts a saved context as record content, and an empty record as none', () => {
    expect(hasRecordContent(idle())).toBe(false);
    const withContext = apply(idle(), { type: 'SET_CLINICAL_CONTEXT', context: { ageYears: 0 } });
    expect(hasRecordContent(withContext)).toBe(true);
    expect(withContext.record.createdAt).toBe(FIXED_NOW);
  });
});
