import type { ComponentType } from 'react';
import type { RouteDef } from '@/app/router';
import type { RecoveryScenario } from '@/core/inference/types';
import { lazyScreen } from '@/features/desk/lazyScreen';
import { RECOVERY_PATHS } from '@/features/desk/recoveryPaths';

function recoveryScreen(scenario: RecoveryScenario): ComponentType {
  return lazyScreen(() =>
    import('./RecoveryPage').then((module) => ({
      default: () => <module.RecoveryPage scenario={scenario} />,
    })),
  );
}

const SCENARIO_ENTRIES = Object.entries(RECOVERY_PATHS) as [RecoveryScenario, string][];

export const recoveryRoutes: RouteDef[] = SCENARIO_ENTRIES.map(([scenario, path]) => ({
  path,
  component: recoveryScreen(scenario),
}));
