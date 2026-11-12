export type UpdatePhase = 'hidden' | 'offline-ready' | 'update-blocked' | 'update-ready';

export interface UpdateSignals {
  /** A new service worker is waiting to take control. */
  needRefresh: boolean;
  /** The shell is cached and works offline. */
  offlineReady: boolean;
  /** False while an unsaved review (ABCDE edit, comparison note) is in progress. */
  canReload: boolean;
}

/**
 * Pure mapping from service worker signals to what the user sees.
 * An update never takes priority over the in-progress work: when reload is not
 * allowed, the update is blocked, not applied.
 */
export function deriveUpdatePhase({ needRefresh, offlineReady, canReload }: UpdateSignals): UpdatePhase {
  if (needRefresh) return canReload ? 'update-ready' : 'update-blocked';
  if (offlineReady) return 'offline-ready';
  return 'hidden';
}
