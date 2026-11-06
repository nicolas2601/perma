import type { ExamStorage } from '@/core/storage/examStorage';
import type { ExamClock } from './clock';
import { systemClock } from './clock';
import { attachAutosave, restoreExam } from './persistence';
import { createInitialState } from './state';
import { createExamStore, type ExamRuntimeStore } from './store';

export interface ExamRuntime {
  store: ExamRuntimeStore;
  storage: ExamStorage;
  /** Resolves after restore. Autosave is attached only after a successful restore. */
  ready: Promise<void>;
  dispose(): void;
}

export interface ExamRuntimeOptions {
  storage: ExamStorage;
  clock?: ExamClock;
  debounceMs?: number;
  onError?: (error: unknown) => void;
}

export function createExamRuntime(options: ExamRuntimeOptions): ExamRuntime {
  const clock = options.clock ?? systemClock;
  const { storage } = options;
  const store = createExamStore(createInitialState(clock), clock);
  const onError = options.onError ?? (() => undefined);
  let detach: () => void = () => undefined;

  const ready = restoreExam(storage, clock)
    .then((state) => {
      store.hydrate(state);
      detach = attachAutosave(store, storage, { debounceMs: options.debounceMs, onError });
    })
    .catch(onError);

  return {
    store,
    storage,
    ready,
    dispose: () => detach(),
  };
}
