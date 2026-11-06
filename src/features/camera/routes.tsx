import type { RouteDef } from '@/app/router';
import { lazyScreen } from '@/features/desk/lazyScreen';
import { CAMERA_PATH, CAPTURE_PATH, GALLERY_PATH, QUALITY_PATH } from '@/features/desk/recoveryPaths';

export const cameraRoutes: RouteDef[] = [
  { path: CAPTURE_PATH, component: lazyScreen(() => import('./Capture')) },
  { path: CAMERA_PATH, component: lazyScreen(() => import('./LiveCamera')) },
  { path: GALLERY_PATH, component: lazyScreen(() => import('./Gallery')) },
  { path: QUALITY_PATH, component: lazyScreen(() => import('./Quality')) },
];
