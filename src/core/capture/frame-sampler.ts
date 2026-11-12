import { ANALYSIS_EDGE, GUIDE_CROP_FRACTION } from './constants';

interface GuideCropRect {
  readonly sx: number;
  readonly sy: number;
  readonly side: number;
}

const MIN_SIDE_PIXELS = 16;

/** Centred square crop matching the 72% guide. Null while the video has no usable size yet. */
export function guideCropRect(videoWidth: number, videoHeight: number): GuideCropRect | null {
  const side = Math.floor(Math.min(videoWidth, videoHeight) * GUIDE_CROP_FRACTION);
  if (side < MIN_SIDE_PIXELS) return null;
  return { sx: Math.floor((videoWidth - side) / 2), sy: Math.floor((videoHeight - side) / 2), side };
}

/** The subset of a 2D canvas context the sampler uses. */
export interface SampleCanvas {
  drawImage(source: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  readRgba(): ArrayBuffer | null;
}

/** Copies the guide crop into an analysis-sized canvas and returns its RGBA bytes (a fresh buffer). */
export function captureGuideCrop(canvas: SampleCanvas, video: HTMLVideoElement): ArrayBuffer | null {
  const rect = guideCropRect(video.videoWidth, video.videoHeight);
  if (!rect) return null;
  canvas.drawImage(video, rect.sx, rect.sy, rect.side, rect.side, 0, 0, ANALYSIS_EDGE, ANALYSIS_EDGE);
  return canvas.readRgba();
}

/** OffscreenCanvas-backed sample surface. Null when the browser has no 2D context for it. */
export function createOffscreenSampleCanvas(): SampleCanvas | null {
  if (typeof OffscreenCanvas === 'undefined') return null;
  const context = new OffscreenCanvas(ANALYSIS_EDGE, ANALYSIS_EDGE).getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  return {
    drawImage: (source, sx, sy, sw, sh, dx, dy, dw, dh) => context.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh),
    readRgba: () => {
      const buffer = context.getImageData(0, 0, ANALYSIS_EDGE, ANALYSIS_EDGE).data.buffer;
      return buffer instanceof ArrayBuffer ? buffer : null;
    },
  };
}

export interface FrameScheduler {
  start(tick: () => void): void;
  stop(): void;
}

/** Uses requestVideoFrameCallback (one callback per presented video frame), or rAF where it is missing. */
export function createVideoFrameScheduler(video: HTMLVideoElement): FrameScheduler {
  let tick: (() => void) | null = null;
  let handle: number | null = null;
  const arm = (): void => {
    const run = (): void => {
      handle = null;
      if (!tick) return;
      tick();
      arm();
    };
    handle = typeof video.requestVideoFrameCallback === 'function'
      ? video.requestVideoFrameCallback(run)
      : requestAnimationFrame(run);
  };
  return {
    start(next) {
      tick = next;
      arm();
    },
    stop() {
      tick = null;
      if (handle === null) return;
      if (typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
      handle = null;
    },
  };
}
