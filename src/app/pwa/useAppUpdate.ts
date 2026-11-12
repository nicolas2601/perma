import { useCallback } from 'react';
import { useRegisterSW } from './registerSw';
import { deriveUpdatePhase, type UpdatePhase } from './updateState';

export interface AppUpdateOptions {
  /** Pass false while an unsaved review is in progress. Reloading would discard it. */
  canReload: boolean;
}

export interface AppUpdate {
  phase: UpdatePhase;
  /** Activates the waiting service worker and reloads. No-op while canReload is false. */
  applyUpdate: () => void;
  /** Hides the update prompt for this page load; the update stays waiting. */
  dismissUpdate: () => void;
  dismissOffline: () => void;
}

/**
 * Adapter over vite-plugin-pwa's React hook. Registration is done by the hook
 * (vite-plugin-pwa injects no separate registerSW script when this module is imported).
 */
export function useAppUpdate({ canReload }: AppUpdateOptions): AppUpdate {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  const applyUpdate = useCallback(() => {
    if (!canReload) return;
    void updateServiceWorker(true);
  }, [canReload, updateServiceWorker]);

  const dismissUpdate = useCallback(() => setNeedRefresh(false), [setNeedRefresh]);
  const dismissOffline = useCallback(() => setOfflineReady(false), [setOfflineReady]);

  return {
    phase: deriveUpdatePhase({ needRefresh, offlineReady, canReload }),
    applyUpdate,
    dismissUpdate,
    dismissOffline,
  };
}
