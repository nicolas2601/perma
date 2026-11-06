import { CaptureInputError } from './errors';

/** RGBA pixels of one analysis frame. Always ANALYSIS_EDGE square in production. */
export interface FramePixels {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8ClampedArray;
}

const MIN_EDGE = 16;
const MAX_EDGE = 256;
const CHANNELS = 4;

const isValidEdge = (edge: number): boolean => Number.isInteger(edge) && edge >= MIN_EDGE && edge <= MAX_EDGE;

/** Rejects geometry or buffer lengths that would index outside the pixel array. */
export function validateFramePixels(frame: FramePixels): FramePixels {
  if (!isValidEdge(frame.width) || !isValidEdge(frame.height)) {
    throw new CaptureInputError('invalid-frame', `edge out of range: ${frame.width}x${frame.height}`);
  }
  if (frame.rgba.length !== frame.width * frame.height * CHANNELS) {
    throw new CaptureInputError('invalid-frame', `buffer length ${frame.rgba.length} does not match ${frame.width}x${frame.height}`);
  }
  return frame;
}

/** Wraps a transferred ArrayBuffer as validated analysis pixels. */
export function framePixelsFromBuffer(buffer: ArrayBuffer, width: number, height: number): FramePixels {
  return validateFramePixels({ width, height, rgba: new Uint8ClampedArray(buffer) });
}
