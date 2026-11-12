import { lazy, Suspense, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useExamDispatch } from '@/core/exam/react';
import { devSeedRequested } from './devSeed';

type ScreenModule = { default: ComponentType };

/**
 * Holds the screen until the DEV-only `?seed=result` chain has run, so the screen's
 * result guard never sees an empty store. Production never requests the seed, so the
 * gate renders its children at once and the seed module is never loaded.
 */
function DevSeedGate({ children }: { children: ReactNode }) {
  const dispatch = useExamDispatch();
  const [ready, setReady] = useState(() => !devSeedRequested(window.location.search));
  useEffect(() => {
    if (ready || !import.meta.env.DEV) return;
    void import('./devSeed').then(async ({ seedResultCommands }) => {
      for (const command of await seedResultCommands()) dispatch(command);
      setReady(true);
    });
  }, [ready, dispatch]);
  return ready ? children : null;
}

/** Lazy screen wrapped in Suspense so each route is its own chunk. */
export function lazyScreen(load: () => Promise<ScreenModule>): ComponentType {
  const Screen = lazy(load);
  return function LazyScreen() {
    return (
      <Suspense fallback={null}>
        <DevSeedGate>
          <Screen />
        </DevSeedGate>
      </Suspense>
    );
  };
}
