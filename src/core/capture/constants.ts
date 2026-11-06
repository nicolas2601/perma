/** Analysis edge in pixels: the guide crop is resampled to ANALYSIS_EDGE x ANALYSIS_EDGE. */
export const ANALYSIS_EDGE = 128;
/** Square guide crop as a share of the shorter video side. Must match the overlay. */
export const GUIDE_CROP_FRACTION = 0.72;
export const TARGET_FPS = 10;
/** Worker must answer one pending task within this deadline, or the advisor degrades to manual. */
export const DEADLINE_MS = 1500;
export const MAX_CONSECUTIVE_FAILURES = 3;

/** Display stability: a new advice needs this many identical consecutive candidates. */
export const STABILITY_FRAMES = 2;
/** Minimum time a shown advice stays on screen before another advice can replace it. */
export const MIN_DWELL_MS = 1000;
/** Rule dwell, in analysed frames: a condition must hold this long to switch a rule on, and to switch it off. */
export const ENTER_FRAMES = 3;
export const EXIT_FRAMES = 5;

/*
 * Every threshold below is a Schmitt trigger: `ON` switches the rule on, `OFF` (the release level, on the
 * other side) switches it off. Values were chosen on the calibration fixtures and inspected on the holdout
 * fixtures, so the holdout is not clean. The test set was scored once with these values frozen (see
 * docs/camera-ml.md). Units are stated per constant.
 */

/** Median luma of the guide crop (0-255). Dark frames ask for more light. */
export const MORE_LIGHT_ON = 60;
export const MORE_LIGHT_OFF = 72;
/** Median luma above this is overexposure. Asks for less light. */
export const LESS_LIGHT_ON = 200;
export const LESS_LIGHT_OFF = 185;

/** Luma at or above which a pixel counts as saturated for the glare rule. */
export const SPECULAR_LUMA = 250;
/** Share of the crop covered by the largest connected saturated region. */
export const GLARE_ON = 0.015;
export const GLARE_OFF = 0.008;

/** Mean luma per cell of a MOTION_GRID x MOTION_GRID grid, relative to the frame mean. */
export const MOTION_GRID = 32;
/**
 * Mean gradient of the relative grid below which a frame has no usable structure, so no motion is measured.
 * Relative units: 0.004 is about a 0.4% change between neighbouring cells.
 */
export const MIN_GRADIENT = 0.004;
/** Shift (grid cells per analysed frame, sharpness-normalised) is smoothed over this many frames. */
export const MOTION_WINDOW = 5;
/** Sustained large motion: about half a grid cell per frame, far above hand-shake and exposure drift. */
export const MOTION_ON = 0.55;
export const MOTION_OFF = 0.4;

/** Laplacian variance over luma variance. Scene-contrast normalised, so dimming does not change it. */
export const FOCUS_ON = 0.1;
export const FOCUS_OFF = 0.14;
/** Below this luma variance the frame is flat and focus is not judged. */
export const MIN_LUMA_VARIANCE = 4;

/**
 * Framing: a pixel is content when it deviates from the median background by more than this share of the
 * background (gain-invariant, so dark and bright frames are measured the same way).
 */
export const CONTENT_RELATIVE = 0.17;
/** Minimum share of content pixels; below it there is no content region. */
export const CONTENT_MIN_FRACTION = 0.01;
/** Trimmed span of content pixels (robust to stray pixels). */
export const CONTENT_TRIM_LOW = 0.02;
export const CONTENT_TRIM_HIGH = 0.98;
/** Larger side of the content span, as a share of the crop. Too small asks to come closer. */
export const CLOSER_ON = 0.38;
export const CLOSER_OFF = 0.44;
/** Too large (cut off at the edges) asks to move back. */
/**
 * Off by default: dermatology photos are close-ups that legitimately fill the frame, so
 * 'move back' advice would push users away from the lesion. The rule stays available for other uses.
 */
export const FARTHER_ADVICE_ENABLED = false;
export const FARTHER_ON = 0.8;
export const FARTHER_OFF = 0.72;
/** Offset of the content centre from the crop centre, as a share of the crop. */
export const CENTER_ON = 0.15;
export const CENTER_OFF = 0.1;

/** Blur head releases its advice this far below its threshold (hysteresis). */
export const BLUR_RELEASE_MARGIN = 0.05;
/** Blur head acceptance: maximum false-alert rate on clean frames. */
export const BLUR_MAX_FALSE_ALERT = 0.05;
