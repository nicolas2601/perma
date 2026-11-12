import { create } from 'zustand';

interface ContourLayerState {
  /** Opt-in model contour layer. Off by default; in-memory only, never persisted. */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useContourLayer = create<ContourLayerState>()((set) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
}));
