import type { RouteDef } from '@/app/router';
import { lazyScreen } from './lazyScreen';

export const deskRoutes: RouteDef[] = [
  { path: '/', component: lazyScreen(() => import('./Home')) },
  { path: '/contexto', component: lazyScreen(() => import('./Context')) },
];
