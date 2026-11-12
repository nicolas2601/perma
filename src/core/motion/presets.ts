import { useReducedMotion, type Transition } from 'motion/react';
import { sheetSpring, indicatorSpring } from './springs';
import { reduceFromPreference } from './reducedMotion';
import {
  EASE_OUT,
  ENTRY_OFFSET_PX,
  MOTION_MS,
  SHEET_EXIT_OFFSET_PX,
  SHEET_OFFSET_PX,
  msToSeconds,
} from './tokens';

export type MotionPresetName = 'entry' | 'sheet' | 'indicator' | 'crossfade';

type Frame = Record<string, string | number>;

export interface MotionPreset {
  readonly initial: Frame;
  readonly animate: Frame;
  readonly exit?: Frame;
  readonly transition: Transition;
  readonly exitTransition?: Transition;
}

const fadeTransition: Transition = { duration: msToSeconds(MOTION_MS.fade), ease: EASE_OUT };
const FADE_IN: Frame = { opacity: 0 };
const FADE_SHOWN: Frame = { opacity: 1 };
const FADE_OUT: Frame = { opacity: 0 };

/** Reduced variants keep the same state change with opacity only and a 100 ms crossfade. */
const PRESETS: Record<MotionPresetName, { full: MotionPreset; reduced: MotionPreset }> = {
  entry: {
    full: {
      initial: { opacity: 0, transform: `translateY(${ENTRY_OFFSET_PX}px)` },
      animate: { opacity: 1, transform: 'translateY(0px)' },
      transition: { duration: msToSeconds(MOTION_MS.entry), ease: EASE_OUT },
    },
    reduced: { initial: FADE_IN, animate: FADE_SHOWN, transition: fadeTransition },
  },
  sheet: {
    full: {
      initial: { opacity: 0, transform: `translateY(${SHEET_OFFSET_PX}px)` },
      animate: { opacity: 1, transform: 'translateY(0px)' },
      exit: { opacity: 0, transform: `translateY(${SHEET_EXIT_OFFSET_PX}px)` },
      transition: sheetSpring,
      exitTransition: { duration: msToSeconds(MOTION_MS.sheetExit), ease: EASE_OUT },
    },
    reduced: {
      initial: FADE_IN,
      animate: FADE_SHOWN,
      exit: FADE_OUT,
      transition: fadeTransition,
      exitTransition: fadeTransition,
    },
  },
  indicator: {
    full: { initial: FADE_IN, animate: FADE_SHOWN, transition: indicatorSpring },
    reduced: { initial: FADE_IN, animate: FADE_SHOWN, transition: fadeTransition },
  },
  crossfade: {
    full: { initial: FADE_IN, animate: FADE_SHOWN, exit: FADE_OUT, transition: fadeTransition },
    reduced: { initial: FADE_IN, animate: FADE_SHOWN, exit: FADE_OUT, transition: fadeTransition },
  },
};

export function resolveMotionPreset(name: MotionPresetName, reducedMotion: boolean): MotionPreset {
  const variant = PRESETS[name];
  return reducedMotion ? variant.reduced : variant.full;
}

export function useMotionPreset(name: MotionPresetName): MotionPreset {
  const reduce = reduceFromPreference(useReducedMotion());
  return resolveMotionPreset(name, reduce);
}
