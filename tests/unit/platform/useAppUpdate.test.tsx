import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerState = vi.hoisted(() => ({
  needRefresh: false,
  offlineReady: false,
  setNeedRefresh: vi.fn(),
  setOfflineReady: vi.fn(),
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../src/app/pwa/registerSw', () => ({
  useRegisterSW: () => ({
    needRefresh: [registerState.needRefresh, registerState.setNeedRefresh],
    offlineReady: [registerState.offlineReady, registerState.setOfflineReady],
    updateServiceWorker: registerState.updateServiceWorker,
  }),
}));

import { useAppUpdate } from '../../../src/app/pwa/useAppUpdate';

describe('useAppUpdate', () => {
  beforeEach(() => {
    registerState.needRefresh = false;
    registerState.offlineReady = false;
    registerState.updateServiceWorker.mockClear();
    registerState.setNeedRefresh.mockClear();
    registerState.setOfflineReady.mockClear();
  });

  it('applies a waiting update with reload when allowed', () => {
    registerState.needRefresh = true;
    const { result } = renderHook(() => useAppUpdate({ canReload: true }));

    expect(result.current.phase).toBe('update-ready');
    act(() => result.current.applyUpdate());
    expect(registerState.updateServiceWorker).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('never reloads while canReload is false, even if applyUpdate is called', () => {
    registerState.needRefresh = true;
    const { result } = renderHook(() => useAppUpdate({ canReload: false }));

    expect(result.current.phase).toBe('update-blocked');
    act(() => result.current.applyUpdate());
    expect(registerState.updateServiceWorker).not.toHaveBeenCalled();
  });

  it('dismisses the update and the offline notice through the hook setters', () => {
    registerState.needRefresh = true;
    registerState.offlineReady = true;
    const { result } = renderHook(() => useAppUpdate({ canReload: true }));

    act(() => result.current.dismissUpdate());
    act(() => result.current.dismissOffline());
    expect(registerState.setNeedRefresh).toHaveBeenCalledWith(false);
    expect(registerState.setOfflineReady).toHaveBeenCalledWith(false);
  });
});
