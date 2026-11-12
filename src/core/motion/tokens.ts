/**
 * Motion numbers from docs/BRIEF.md (Motion section) and docs/adr/R3-motion.md.
 * Milliseconds live here; seconds are produced only by msToSeconds for the Motion adapter.
 */
export const MOTION_MS = {
  press: 140,
  entry: 220,
  accordion: 200,
  route: 220,
  sheet: 240,
  sheetExit: 120,
  fade: 100,
  stagger: 80,
} as const;

export const STAGGER_RANGE_MS = { min: 60, max: 100 } as const;
export const PRESS_RANGE_MS = { min: 120, max: 160 } as const;
export const PRESS_SCALE = 0.97;
export const PRESS_REDUCED_OPACITY = 0.85;
export const ENTRY_OFFSET_PX = 12;
export const SHEET_OFFSET_PX = 16;
export const SHEET_EXIT_OFFSET_PX = 8;

/** Same curve as --ease-out in src/styles/tokens.css. Entries never use ease-in. */
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export const msToSeconds = (ms: number): number => ms / 1000;
