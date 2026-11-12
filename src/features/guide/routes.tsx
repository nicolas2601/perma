import type { RouteDef } from '@/app/router';
import { lazyScreen } from '@/features/inspect/lazyRoute';

export const guideRoutes: RouteDef[] = [
  { path: '/guia', component: lazyScreen(() => import('./GuideScreen')) },
  { path: '/guia/privacidad', component: lazyScreen(() => import('./PrivacyScreen')) },
  { path: '/investigacion/tono', component: lazyScreen(() => import('./ToneScreen')), devOnly: true },
];
