import type { ExamClock } from './clock';
import type { ExamCommand } from './commands';
import type { ExamState } from './contract';
import {
  acknowledgeExport,
  back,
  confirmImage,
  discardImage,
  discardRecord,
  forward,
  freshRecord,
  loadImage,
  resultOk,
  send,
  setConsent,
  setCriterion,
  setNote,
  setSite,
  startCapture,
  stopWaiting,
} from './flow';
import { fault, recover } from './recovery';

/**
 * Pure transition function. Illegal or stale commands return the same state
 * reference, so subscribers are not notified.
 */
export function examReducer(state: ExamState, command: ExamCommand, clock: ExamClock): ExamState {
  switch (command.type) {
    case 'SET_SITE':
      return setSite(state, command.site);
    case 'START_CAPTURE':
      return startCapture(state);
    case 'IMAGE_LOADED':
      return loadImage(state, command.image);
    case 'IMAGE_DISCARDED':
      return discardImage(state);
    case 'CONFIRM_IMAGE':
      return confirmImage(state);
    case 'CONSENT':
      return setConsent(state, command.value);
    case 'SEND':
      return send(state);
    case 'STOP_WAITING':
      return stopWaiting(state);
    case 'RESULT_OK':
      return resultOk(state, command.result);
    case 'BACK':
      return back(state);
    case 'OPEN_INSPECT':
    case 'OPEN_ABCDE':
    case 'OPEN_COMPARE':
    case 'OPEN_EXPORT':
      return forward(state, command.type);
    case 'ABCDE_SET':
      return setCriterion(state, command.criterion, command.value);
    case 'NOTE_SET':
      return setNote(state, command.note);
    case 'ACK_EXPORT':
      return acknowledgeExport(state, command.format, clock);
    case 'FAULT':
      return fault(state, command.scenario);
    case 'RECOVER':
      return recover(state, command.scenario, 'mode' in command ? command.mode : 'back');
    case 'DISCARD_RECORD':
      return discardRecord(state);
    case 'NEW_RECORD':
      return state.phase === 'exported' ? freshRecord(state, clock) : state;
    case 'RESET':
      return freshRecord(state, clock);
    default:
      return state;
  }
}
