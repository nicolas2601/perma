import type { RouteDef } from '@/app/router';
import { lazyScreen } from '@/features/desk/lazyScreen';
import { CONSENT_PATH, PROCESSING_PATH } from '@/features/desk/recoveryPaths';

export const consentRoutes: RouteDef[] = [
  { path: CONSENT_PATH, component: lazyScreen(() => import('./Consent')) },
  { path: PROCESSING_PATH, component: lazyScreen(() => import('./Processing')) },
];
