import type { InferenceResult } from '@/core/inference/types';
import type { AbcdeCriterion } from '@/core/storage/types';
import type { ExamClock } from './clock';
import type { ExamImage, ExamPhase, ExamState } from './contract';
import { changeImage, changeRecord, sameContent } from './content';
import { createInitialState } from './state';
import { BACK_TARGET, FORWARD_TRANSITION } from './tables';

const CAPTURE_INPUT_PHASES: ReadonlySet<ExamPhase> = new Set(['contextSet', 'capturing', 'reviewing']);
const EDITABLE_ABCDE_PHASES: ReadonlySet<ExamPhase> = new Set(['abcde', 'exported']);
const NOTE_EDITABLE_PHASES: ReadonlySet<ExamPhase> = new Set(['compare', 'exported']);

export function withPhase(state: ExamState, phase: ExamPhase): ExamState {
  return state.phase === phase ? state : { ...state, phase };
}

export function setSite(state: ExamState, site: string | null): ExamState {
  if (state.phase !== 'idle' && state.phase !== 'contextSet') return state;
  return withPhase(changeRecord(state, { bodySite: site }), 'contextSet');
}

export function startCapture(state: ExamState): ExamState {
  return state.phase === 'contextSet' ? withPhase(state, 'capturing') : state;
}

export function loadImage(state: ExamState, image: ExamImage): ExamState {
  if (!CAPTURE_INPUT_PHASES.has(state.phase)) return state;
  return withPhase(changeImage(state, image), 'reviewing');
}

export function discardImage(state: ExamState): ExamState {
  if (state.phase !== 'reviewing') return state;
  return withPhase(changeImage(state, null), 'capturing');
}

export function confirmImage(state: ExamState): ExamState {
  if (state.phase !== 'reviewing' || state.image === null) return state;
  return withPhase(state, 'consenting');
}

export function setConsent(state: ExamState, value: boolean): ExamState {
  if (state.phase !== 'consenting' || state.consented === value) return state;
  return { ...state, consented: value };
}

/** Single-flight: SEND is only legal from consenting with consent and an image. */
export function send(state: ExamState): ExamState {
  const ready = state.phase === 'consenting' && state.consented && state.image !== null;
  return ready ? withPhase(state, 'processing') : state;
}

/** Keeps the image; consent must be pressed again before any new SEND (architecture section 3). */
export function stopWaiting(state: ExamState): ExamState {
  if (state.phase !== 'processing') return state;
  return { ...state, phase: 'reviewing', consented: false };
}

/** A late response after stopWaiting arrives in another phase and is dropped here. */
export function resultOk(state: ExamState, result: InferenceResult): ExamState {
  if (state.phase !== 'processing') return state;
  return { ...state, phase: 'result', result };
}

export function back(state: ExamState): ExamState {
  const target = BACK_TARGET[state.phase];
  if (target === undefined) return state;
  const base = state.phase === 'reviewing' ? changeImage(state, null) : state;
  return withPhase(base, target);
}

export function forward(state: ExamState, command: keyof typeof FORWARD_TRANSITION): ExamState {
  const [from, to] = FORWARD_TRANSITION[command];
  return state.phase === from ? withPhase(state, to) : state;
}

export function setCriterion(
  state: ExamState,
  criterion: AbcdeCriterion,
  value: string | null,
): ExamState {
  if (!EDITABLE_ABCDE_PHASES.has(state.phase)) return state;
  const abcde = { ...state.record.abcde };
  const answer = value?.trim() ? value : null;
  if (answer === null) delete abcde[criterion];
  else abcde[criterion] = answer;
  return changeRecord(state, { abcde });
}

/**
 * Editing after export is allowed on purpose: it is the only way the ack can be
 * invalidated (G5). The phase stays "exported" and the user must export again.
 */
export function setNote(state: ExamState, note: string): ExamState {
  return NOTE_EDITABLE_PHASES.has(state.phase) ? changeRecord(state, { note }) : state;
}

/**
 * Download completed (the only source of truth for "exported"). Lists the record
 * version the ack is issued for. lastExport does not bump the version.
 */
export function acknowledgeExport(
  state: ExamState,
  format: 'json' | 'pdf',
  clock: ExamClock,
): ExamState {
  if (state.phase !== 'exporting') return state;
  const version = state.record.registryVersion;
  const record = {
    ...state.record,
    lastExport: { at: clock.now(), format, registryVersion: version },
  };
  return { ...state, record, ackRegistryVersion: version, phase: 'exported' };
}

export function freshRecord(state: ExamState, clock: ExamClock): ExamState {
  return createInitialState(clock, state.record.registryVersion + 1);
}

/** G12: clears image, ABCDE, note and ack in one transition. Reference pages never reach here. */
export function discardRecord(state: ExamState): ExamState {
  const record = { ...state.record, abcde: {}, note: '', bodySite: null, priorImageId: null };
  const changed = !sameContent(state.record, record) || state.image !== null;
  return {
    ...state,
    image: null,
    result: null,
    consented: false,
    phase: 'idle',
    record: changed ? { ...record, registryVersion: state.record.registryVersion + 1 } : state.record,
    ackRegistryVersion: changed ? null : state.ackRegistryVersion,
  };
}
