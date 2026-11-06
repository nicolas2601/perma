/** Stubs matchMedia so Motion's useReducedMotion sees the requested preference (jsdom has no matchMedia). */
export function stubReducedMotion(reduced: boolean): void {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
