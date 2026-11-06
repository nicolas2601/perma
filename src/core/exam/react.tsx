import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { ExamCommand } from './commands';
import type { ExamState } from './contract';
import type { ExamRuntimeStore } from './store';

const ExamContext = createContext<ExamRuntimeStore | null>(null);

export function ExamProvider({
  store,
  children,
}: {
  store: ExamRuntimeStore;
  children: ReactNode;
}) {
  return <ExamContext.Provider value={store}>{children}</ExamContext.Provider>;
}

function useExamStore(): ExamRuntimeStore {
  const store = useContext(ExamContext);
  if (store === null) throw new Error('useExam must be used inside <ExamProvider>');
  return store;
}

/**
 * Subscribes to a slice of the exam state. The selector runs on every snapshot,
 * so it must return stable values (primitives or existing references). Returning
 * a freshly built object would make React re-render forever.
 */
export function useExam<T>(selector: (state: ExamState) => T): T {
  const store = useExamStore();
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export function useExamDispatch(): (command: ExamCommand) => void {
  return useExamStore().dispatch;
}
