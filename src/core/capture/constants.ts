/** Analysis edge in pixels: the guide crop is resampled to ANALYSIS_EDGE x ANALYSIS_EDGE. */
export const ANALYSIS_EDGE = 128;
/** Square guide crop as a share of the shorter video side. Must match the overlay. */
export const GUIDE_CROP_FRACTION = 0.72;
export const TARGET_FPS = 10;
/** Worker must answer one pending task within this deadline, or the advisor degrades to manual. */
export const DEADLINE_MS = 1500;
export const MAX_CONSECUTIVE_FAILURES = 3;
/** An advice changes only after this many identical consecutive candidates. */
export const STABILITY_FRAMES = 2;

export const DARK_LUMA = 10;
export const GLARE_LUMA = 245;
export const SPECULAR_LUMA = 250;
/** Share of pixels that must be dark (or saturated) for a global exposure problem. */
export const EXTREME_FRACTION = 0.9;
/** Hysteresis release level for the global exposure rules. */
export const EXTREME_RELEASE_FRACTION = 0.8;
/** Largest connected saturated region, as a share of the frame, that triggers local glare. */
export const SPECULAR_ON = 0.03;
export const SPECULAR_OFF = 0.015;

/** Laplacian variance below which the frame has too little detail to judge focus. */
export const DETAIL_ON = 8;
export const DETAIL_OFF = 12;

export const MOTION_GRID = 32;
/** Mean absolute luma change between consecutive analyzed frames, on the motion grid. */
export const MOTION_ON = 6;
export const MOTION_OFF = 3;

/** Luma distance from the median background that marks a pixel as content. */
export const CONTENT_CONTRAST = 25;
/** Minimum share of content pixels; below it there is no content region. */
export const CONTENT_MIN_FRACTION = 0.01;
/** Trimmed span of content pixels (robust to stray pixels). */
export const CONTENT_TRIM_LOW = 0.02;
export const CONTENT_TRIM_HIGH = 0.98;
/** Content span (larger side, share of the frame) below which the area looks too small. */
export const CLOSER_ON = 0.35;
export const CLOSER_OFF = 0.45;
/** Offset of the content centre from the frame centre, as a share of the frame. */
export const CENTER_ON = 0.2;
export const CENTER_OFF = 0.12;

/** Blur head releases its advice this far below its threshold (hysteresis). */
export const BLUR_RELEASE_MARGIN = 0.05;
/** Blur head acceptance: maximum false-alert rate on clean frames. */
export const BLUR_MAX_FALSE_ALERT = 0.05;
