import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExamProvider } from '@/core/exam/react';
import { createExamRuntime, type ExamRuntime } from '@/core/exam/runtime';
import { I18nProvider } from '@/core/i18n/I18nProvider';
import { createExamStorage } from '@/core/storage/examStorage';
import { createIndexedDbAdapter } from '@/core/storage/indexedDbAdapter';

export interface AppProvidersProps {
  children: ReactNode;
  /** Injected in tests; the app uses the shared IndexedDB-backed runtime. */
  runtime?: ExamRuntime;
  queryClient?: QueryClient;
}

let sharedRuntime: ExamRuntime | null = null;

/**
 * One runtime per page. Created lazily and never inside a useState initializer:
 * StrictMode runs those twice, which would start two autosave writers.
 */
function getSharedRuntime(): ExamRuntime {
  sharedRuntime ??= createExamRuntime({
    storage: createExamStorage(hasIndexedDb() ? createIndexedDbAdapter() : null),
    onError: (error) => console.warn('[perma] exam storage error', error),
  });
  return sharedRuntime;
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** Children mount only after the stored exam is restored, so no screen renders an empty record over saved data. */
function useRestored(ready: Promise<void>): boolean {
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    let active = true;
    void ready.then(() => {
      if (active) setRestored(true);
    });
    return () => {
      active = false;
    };
  }, [ready]);
  return restored;
}

export function AppProviders({ children, runtime, queryClient }: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? new QueryClient());
  const exam = runtime ?? getSharedRuntime();
  const restored = useRestored(exam.ready);
  if (!restored) return null;
  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ExamProvider store={exam.store}>{children}</ExamProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
