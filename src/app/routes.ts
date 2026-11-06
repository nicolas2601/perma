import type { RouteDef } from './router';
import { deskRoutes } from '@/features/desk/routes';
import { consentRoutes } from '@/features/consent/routes';
import { cameraRoutes } from '@/features/camera/routes';
import { recoveryRoutes } from '@/features/recovery/routes';
import { inspectRoutes } from '@/features/inspect/routes';
import { abcdeRoutes } from '@/features/abcde/routes';
import { compareRoutes } from '@/features/compare/routes';
import { reviewRoutes } from '@/features/review/routes';
import { guideRoutes } from '@/features/guide/routes';

const all: RouteDef[] = [
  ...deskRoutes, ...cameraRoutes, ...consentRoutes, ...inspectRoutes, ...abcdeRoutes,
  ...compareRoutes, ...reviewRoutes, ...guideRoutes, ...recoveryRoutes,
];

export const routes: RouteDef[] = import.meta.env.DEV ? all : all.filter((r) => !r.devOnly);
