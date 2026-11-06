import { lazy, Suspense, type ComponentType } from 'react';

type ScreenModule = { default: ComponentType };

/** Lazy screen wrapped in Suspense so each route is its own chunk. */
export function lazyScreen(load: () => Promise<ScreenModule>): ComponentType {
  const Screen = lazy(load);
  return function LazyScreen() {
    return (
      <Suspense fallback={null}>
        <Screen />
      </Suspense>
    );
  };
}
