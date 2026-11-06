import type { RouteDef } from '@/app/router';
import { lazyScreen } from '@/features/inspect/lazyRoute';

export const reviewRoutes: RouteDef[] = [
  { path: '/revision', component: lazyScreen(() => import('./SummaryScreen')) },
  { path: '/revision/exportar', component: lazyScreen(() => import('./ExportScreen')) },
  { path: '/revision/exportada', component: lazyScreen(() => import('./ExportDoneScreen')) },
];
