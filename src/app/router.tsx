import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

export interface RouteDef {
  /** Path pattern, supports `:param` segments. */
  path: string;
  component: ComponentType;
  /** Excluded from production builds when true. */
  devOnly?: boolean;
}

export interface Location {
  path: string;
  search: URLSearchParams;
}

interface RouterValue {
  location: Location;
  params: Record<string, string>;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);
const TRANSITION_MS = 220;

function readLocation(): Location {
  return { path: window.location.pathname, search: new URLSearchParams(window.location.search) };
}

export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i += 1) {
    const seg = a[i] as string;
    const val = b[i] as string;
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(val);
    else if (seg !== val) return null;
  }
  return params;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Router({ routes, fallback, children }: { routes: RouteDef[]; fallback: ComponentType; children?: ReactNode }) {
  const [location, setLocation] = useState<Location>(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const apply = () => {
      if (options?.replace) window.history.replaceState(null, '', to);
      else window.history.pushState(null, '', to);
      flushSync(() => setLocation(readLocation()));
    };
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !prefersReducedMotion()) doc.startViewTransition(apply);
    else apply();
  }, []);

  const value = useMemo<RouterValue>(() => {
    let params: Record<string, string> = {};
    for (const route of routes) {
      const hit = matchRoute(route.path, location.path);
      if (hit) { params = hit; break; }
    }
    return { location, params, navigate };
  }, [location, navigate, routes]);

  const active = routes.find((r) => matchRoute(r.path, location.path));
  const Screen = active?.component ?? fallback;
  return (
    <RouterContext.Provider value={value}>
      <Screen />
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside <Router>');
  return ctx;
}

export const useNavigate = () => useRouter().navigate;
export const useParams = () => useRouter().params;
export const useSearch = () => useRouter().location.search;

export function Link({ to, replace, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean }) {
  const navigate = useNavigate();
  return (
    <a
      {...rest}
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to, { replace });
      }}
    />
  );
}

export { TRANSITION_MS };
