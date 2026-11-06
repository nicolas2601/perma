import type { RouteDef } from '@/app/router';
import { lazyScreen } from '@/features/inspect/lazyRoute';

/** ABCDE accordion page (`?criterio=a..e` deep links) and the calibration reference pages. */
export const abcdeRoutes: RouteDef[] = [
  { path: '/examen/abcde', component: lazyScreen(() => import('./AbcdeScreen')) },
  { path: '/examen/calibracion', component: lazyScreen(() => import('./CalibrationScreen')) },
];
