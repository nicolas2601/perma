import type { ExamClock } from './clock';
import { systemClock } from './clock';
import type { ExamCommand } from './commands';
import type { ExamState, ExamStore } from './contract';
import { examReducer } from './reducer';

/** ExamStore from the contract, plus hydration (restore from storage) and the widened command type. */
export interface ExamRuntimeStore extends ExamStore {
  dispatch(command: ExamCommand): void;
  hydrate(state: ExamState): void;
}

export function createExamStore(
  initial: ExamState,
  clock: ExamClock = systemClock,
): ExamRuntimeStore {
  let state = initial;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  return {
    getState: () => state,
    dispatch(command) {
      const next = examReducer(state, command, clock);
      if (next === state) return;
      state = next;
      notify();
    },
    hydrate(next) {
      state = next;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
