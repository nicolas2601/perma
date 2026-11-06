import { lazy, Suspense, type ComponentType } from 'react';

type ScreenModule = { default: ComponentType };

/** Wraps a lazily loaded screen in Suspense so the router can render it directly. */
export function lazyScreen(loader: () => Promise<ScreenModule>): ComponentType {
  const Screen = lazy(loader);
  return function LazyScreen() {
    return (
      <Suspense fallback={<div aria-busy="true" className="min-h-dvh bg-canvas" />}>
        <Screen />
      </Suspense>
    );
  };
}
