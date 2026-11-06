import type { RouteDef } from '@/app/router';
import { lazyScreen } from './lazyRoute';

export const inspectRoutes: RouteDef[] = [
  { path: '/resultado', component: lazyScreen(() => import('./ResultScreen')) },
  { path: '/resultado/clases', component: lazyScreen(() => import('./ClassesScreen')) },
  { path: '/resultado/clases/:clase', component: lazyScreen(() => import('./ClassDetailScreen')) },
  { path: '/inspeccion', component: lazyScreen(() => import('./ViewerScreen')) },
  { path: '/inspeccion/original', component: lazyScreen(() => import('./OriginalScreen')) },
  { path: '/inspeccion/zoom', component: lazyScreen(() => import('./ZoomScreen')) },
];
