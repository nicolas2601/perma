import type { RouteDef } from '@/app/router';
import { lazyScreen } from '@/features/inspect/lazyRoute';

export const compareRoutes: RouteDef[] = [
  { path: '/examen/comparar', component: lazyScreen(() => import('./CompareScreen')) },
  { path: '/examen/previo', component: lazyScreen(() => import('./PriorScreen')) },
];
