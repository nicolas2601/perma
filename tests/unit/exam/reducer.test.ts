import { describe, expect, it } from 'vitest';
import {
  createEmptyRecord,
  createHydratedState,
  createInitialState,
  isAckValid,
} from '@/core/exam/state';
import { FIXED_NOW, fixedClock, makeImage, makeResult, run } from './fixtures';

const clock = fixedClock();
const idle = () => createInitialState(clock);

function atReviewing() {
  return run(
    idle(),
    clock,
    { type: 'SET_SITE', site: 'antebrazo' },
    { type: 'START_CAPTURE' },
    { type: 'IMAGE_LOADED', image: makeImage() },
  );
}

function atExporting() {
  const toAbcde = run(
    atReviewing(),
    clock,
    { type: 'CONFIRM_IMAGE' },
    { type: 'CONSENT', value: true },
    { type: 'SEND' },
    { type: 'RESULT_OK', result: makeResult() },
    { type: 'OPEN_INSPECT' },
    { type: 'OPEN_ABCDE' },
    { type: 'OPEN_COMPARE' },
  );
  return run(toAbcde, clock, { type: 'OPEN_EXPORT' });
}

describe('exam reducer: main path', () => {
  it('walks idle to exported through the architecture main path', () => {
    const state = run(
      atExporting(),
      clock,
      { type: 'ACK_EXPORT', format: 'json' },
    );
    expect(state.phase).toBe('exported');
    expect(state.record.lastExport).toEqual({ at: FIXED_NOW, format: 'json', registryVersion: state.record.registryVersion });
    expect(isAckValid(state)).toBe(true);
  });

  it('ignores ACK_EXPORT outside exporting so an ack cannot be faked', () => {
    const before = atReviewing();
    expect(run(before, clock, { type: 'ACK_EXPORT', format: 'pdf' })).toBe(before);
  });

  it('ignores BACK from idle because there is nothing to go back to', () => {
    const before = idle();
    expect(run(before, clock, { type: 'BACK' })).toBe(before);
  });
});

describe('exam reducer: send gate (G1)', () => {
  it('refuses SEND without consent and returns the same reference', () => {
    const consenting = run(atReviewing(), clock, { type: 'CONFIRM_IMAGE' });
    expect(run(consenting, clock, { type: 'SEND' })).toBe(consenting);
  });

  it('refuses SEND without an image', () => {
    const consenting = { ...run(atReviewing(), clock, { type: 'CONFIRM_IMAGE' }), image: null };
    const withConsent = run(consenting, clock, { type: 'CONSENT', value: true });
    expect(run(withConsent, clock, { type: 'SEND' })).toBe(withConsent);
  });

  it('is single-flight: a second SEND while processing is ignored', () => {
    const processing = run(
      atReviewing(),
      clock,
      { type: 'CONFIRM_IMAGE' },
      { type: 'CONSENT', value: true },
      { type: 'SEND' },
    );
    expect(processing.phase).toBe('processing');
    expect(run(processing, clock, { type: 'SEND' })).toBe(processing);
  });
});

describe('exam reducer: stop waiting and late responses', () => {
  const processing = () =>
    run(atReviewing(), clock, { type: 'CONFIRM_IMAGE' }, { type: 'CONSENT', value: true }, { type: 'SEND' });

  it('keeps the image, returns to reviewing and requires consent again', () => {
    const stopped = run(processing(), clock, { type: 'STOP_WAITING' });
    expect(stopped.phase).toBe('reviewing');
    expect(stopped.image).not.toBeNull();
    expect(stopped.consented).toBe(false);
  });

  it('discards a late response that arrives after stop', () => {
    const stopped = run(processing(), clock, { type: 'STOP_WAITING' });
    expect(run(stopped, clock, { type: 'RESULT_OK', result: makeResult() })).toBe(stopped);
  });

  it('blocks the back gesture while processing (G11)', () => {
    const inFlight = processing();
    expect(run(inFlight, clock, { type: 'BACK' })).toBe(inFlight);
  });
});

describe('exam reducer: recovery states', () => {
  it('enters offline from processing and returns to reviewing on back', () => {
    const inFlight = run(
      atReviewing(),
      clock,
      { type: 'CONFIRM_IMAGE' },
      { type: 'CONSENT', value: true },
      { type: 'SEND' },
    );
    const offline = run(inFlight, clock, { type: 'FAULT', scenario: 'offline' });
    expect(offline.phase).toBe('recover:offline');
    expect(run(offline, clock, { type: 'RECOVER', scenario: 'offline', mode: 'back' }).phase).toBe('reviewing');
  });

  it('retry from a network fault goes to consenting and never sends by itself', () => {
    const inFlight = run(
      atReviewing(),
      clock,
      { type: 'CONFIRM_IMAGE' },
      { type: 'CONSENT', value: true },
      { type: 'SEND' },
    );
    const retried = run(
      inFlight,
      clock,
      { type: 'FAULT', scenario: 'timeout' },
      { type: 'RECOVER', scenario: 'timeout', mode: 'retry' },
    );
    expect(retried.phase).toBe('consenting');
    expect(retried.image).not.toBeNull();
  });

  it('rejects a fault that is not legal from the current phase', () => {
    const before = idle();
    expect(run(before, clock, { type: 'FAULT', scenario: 'server-error' })).toBe(before);
  });

  it('a file fault from reviewing returns to capturing and discards the image', () => {
    const faulted = run(atReviewing(), clock, { type: 'FAULT', scenario: 'file-unavailable' });
    const back = run(faulted, clock, { type: 'RECOVER', scenario: 'file-unavailable' });
    expect(back.phase).toBe('capturing');
    expect(back.image).toBeNull();
  });

  it('export failure returns to compare on back and to exporting on retry', () => {
    const failed = run(atExporting(), clock, { type: 'FAULT', scenario: 'export-unavailable' });
    expect(failed.phase).toBe('recover:export-unavailable');
    expect(run(failed, clock, { type: 'RECOVER', scenario: 'export-unavailable' }).phase).toBe('compare');
    expect(
      run(failed, clock, { type: 'RECOVER', scenario: 'export-unavailable', mode: 'retry' }).phase,
    ).toBe('exporting');
  });

  it('a recovery keeps the record intact', () => {
    const before = atReviewing();
    const faulted = run(before, clock, { type: 'FAULT', scenario: 'offline' });
    expect(faulted.record).toBe(before.record);
  });
});

describe('exam reducer: registry version and ack invalidation (G5, G6)', () => {
  const exported = () => run(atExporting(), clock, { type: 'ACK_EXPORT', format: 'pdf' });

  it('invalidates the ack when ABCDE content changes after export', () => {
    const exportedState = exported();
    const edited = run(exportedState, clock, { type: 'ABCDE_SET', criterion: 'A', value: 'asimetrica' });
    expect(edited.record.registryVersion).toBe(exportedState.record.registryVersion + 1);
    expect(edited.ackRegistryVersion).toBeNull();
    expect(isAckValid(edited)).toBe(false);
  });

  it('invalidates the ack when the note changes after export', () => {
    const edited = run(exported(), clock, { type: 'NOTE_SET', note: 'revisar' });
    expect(isAckValid(edited)).toBe(false);
  });

  it('does not bump the version for a no-op edit, so the ack survives', () => {
    const exportedState = exported();
    const same = run(exportedState, clock, { type: 'SET_SITE', site: 'antebrazo' });
    expect(same).toBe(exportedState);
    expect(isAckValid(exportedState)).toBe(true);
  });

  it('does not bump the version when the acknowledgement writes lastExport', () => {
    const beforeAck = run(atExporting(), clock);
    const afterAck = run(beforeAck, clock, { type: 'ACK_EXPORT', format: 'pdf' });
    expect(afterAck.record.registryVersion).toBe(beforeAck.record.registryVersion);
    expect(isAckValid(afterAck)).toBe(true);
  });
});

describe('exam reducer: record content', () => {
  it('stores unanswered criteria as absent and removes an answer on null', () => {
    const inAbcde = run(atExporting(), clock, { type: 'BACK' }, { type: 'BACK' });
    const answered = run(inAbcde, clock, { type: 'ABCDE_SET', criterion: 'B', value: 'irregular' });
    expect(answered.record.abcde).toEqual({ B: 'irregular' });
    const cleared = run(answered, clock, { type: 'ABCDE_SET', criterion: 'B', value: null });
    expect(cleared.record.abcde).toEqual({});
  });

  it('treats a blank answer as unanswered', () => {
    const inAbcde = run(atExporting(), clock, { type: 'BACK' }, { type: 'BACK' });
    expect(run(inAbcde, clock, { type: 'ABCDE_SET', criterion: 'C', value: '   ' })).toBe(inAbcde);
  });

  it('ignores ABCDE edits outside abcde or exported', () => {
    const reviewing = atReviewing();
    expect(run(reviewing, clock, { type: 'ABCDE_SET', criterion: 'A', value: 'x' })).toBe(reviewing);
  });

  it('a new image bumps the version and drops the stale result', () => {
    const first = atReviewing();
    const second = run(first, clock, { type: 'IMAGE_LOADED', image: makeImage({ name: 'b.jpg' }) });
    expect(second.record.registryVersion).toBe(first.record.registryVersion + 1);
    expect(second.result).toBeNull();
  });

  it('discarding the record clears image, ABCDE, note and ack in one transition (G12)', () => {
    const exported = run(atExporting(), clock, { type: 'ACK_EXPORT', format: 'json' });
    const discarded = run(exported, clock, { type: 'DISCARD_RECORD' });
    expect(discarded.phase).toBe('idle');
    expect(discarded.image).toBeNull();
    expect(discarded.record.abcde).toEqual({});
    expect(discarded.record.note).toBe('');
    expect(discarded.ackRegistryVersion).toBeNull();
    expect(discarded.record.bodySite).toBeNull();
    expect(discarded.record.priorImageId).toBeNull();
    expect(discarded.record.registryVersion).toBe(exported.record.registryVersion + 1);
  });

  it('starts a new record only from exported', () => {
    const notExported = atReviewing();
    expect(run(notExported, clock, { type: 'NEW_RECORD' })).toBe(notExported);
    const exported = run(atExporting(), clock, { type: 'ACK_EXPORT', format: 'json' });
    const fresh = run(exported, clock, { type: 'NEW_RECORD' });
    expect(fresh.phase).toBe('idle');
    expect(fresh.record.registryVersion).toBe(exported.record.registryVersion + 1);
  });

  it('RESET starts fresh from any phase and keeps the version monotonic', () => {
    const reviewing = atReviewing();
    const reset = run(reviewing, clock, { type: 'RESET' });
    expect(reset.phase).toBe('idle');
    expect(reset.image).toBeNull();
    expect(reset.record.registryVersion).toBe(reviewing.record.registryVersion + 1);
  });
});

describe('exam hydration', () => {
  it('restores an image to reviewing and a site alone to contextSet', () => {
    const withImage = createHydratedState({
      record: { ...createEmptyRecord(clock), bodySite: 'espalda' },
      image: makeImage(),
    });
    expect(withImage.phase).toBe('reviewing');
    const siteOnly = createHydratedState({
      record: { ...createEmptyRecord(clock), bodySite: 'espalda' },
      image: null,
    });
    expect(siteOnly.phase).toBe('contextSet');
    expect(createHydratedState({ record: createEmptyRecord(clock), image: null }).phase).toBe('idle');
  });

  it('keeps the export ack only while the restored version matches the export', () => {
    const base = createEmptyRecord(clock, 3);
    const valid = createHydratedState({
      record: { ...base, lastExport: { at: FIXED_NOW, format: 'json', registryVersion: 3 } },
      image: null,
    });
    expect(isAckValid(valid)).toBe(true);
    const stale = createHydratedState({
      record: { ...base, registryVersion: 4, lastExport: { at: FIXED_NOW, format: 'json', registryVersion: 3 } },
      image: null,
    });
    expect(isAckValid(stale)).toBe(false);
  });
});
