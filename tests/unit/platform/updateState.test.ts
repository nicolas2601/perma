import { describe, expect, it } from 'vitest';
import { deriveUpdatePhase } from '../../../src/app/pwa/updateState';

describe('deriveUpdatePhase', () => {
  it('is hidden when there is no signal', () => {
    expect(deriveUpdatePhase({ needRefresh: false, offlineReady: false, canReload: true })).toBe('hidden');
  });

  it('shows offline-ready when the shell is cached and no update waits', () => {
    expect(deriveUpdatePhase({ needRefresh: false, offlineReady: true, canReload: true })).toBe('offline-ready');
  });

  it('offers the update when reload is allowed', () => {
    expect(deriveUpdatePhase({ needRefresh: true, offlineReady: false, canReload: true })).toBe('update-ready');
  });

  it('blocks the update while an unsaved review is open, never applies it', () => {
    expect(deriveUpdatePhase({ needRefresh: true, offlineReady: false, canReload: false })).toBe('update-blocked');
  });

  it('gives the pending update priority over the offline notice', () => {
    expect(deriveUpdatePhase({ needRefresh: true, offlineReady: true, canReload: true })).toBe('update-ready');
    expect(deriveUpdatePhase({ needRefresh: true, offlineReady: true, canReload: false })).toBe('update-blocked');
  });
});
