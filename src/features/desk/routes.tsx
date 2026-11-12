import type { RouteDef } from '@/app/router';
import { lazyScreen } from './lazyScreen';
import Home from './Home';

export const deskRoutes: RouteDef[] = [
  // Home is the landing route: bundled with the entry to avoid a second round trip before first paint.
  { path: '/', component: Home },
  { path: '/contexto', component: lazyScreen(() => import('./Context')) },
];
