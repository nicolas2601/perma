/** JPEG markers (ITU T.81 Annex B). */
const MARKER_PREFIX = 0xff;
const SOI = 0xd8;
const MARKER_APP1 = 0xe1;
const MARKER_SOS = 0xda;
const MARKER_EOI = 0xd9;
const JPEG_HEADER_BYTES = 2;
const MIN_SEGMENT_LENGTH = 2;

export type ExifStripReason = 'not-jpeg' | 'malformed';

export class ExifStripError extends Error {
  constructor(readonly reason: ExifStripReason) {
    super(`EXIF strip failed: ${reason}`);
    this.name = 'ExifStripError';
  }
}

interface Segment {
  start: number;
  code: number;
  end: number;
}

/**
 * Returns a JPEG without APP1 segments. EXIF and XMP both live in APP1, and GPS
 * coordinates can sit in either, so both go. Pixel data is untouched.
 * Non-JPEG input throws: this module does not guess about other containers.
 */
export async function stripExifLocation(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return new Blob([removeApp1Segments(bytes)], { type: 'image/jpeg' });
}

export function removeApp1Segments(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  if (!isJpeg(bytes)) throw new ExifStripError('not-jpeg');
  const kept: Uint8Array[] = [bytes.subarray(0, JPEG_HEADER_BYTES)];
  let offset = JPEG_HEADER_BYTES;
  while (offset < bytes.length) {
    const segment = readSegment(bytes, offset);
    if (segment.code === MARKER_EOI || segment.code === MARKER_SOS) {
      kept.push(bytes.subarray(offset));
      break;
    }
    if (segment.code !== MARKER_APP1) kept.push(bytes.subarray(segment.start, segment.end));
    offset = segment.end;
  }
  return concat(kept);
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= JPEG_HEADER_BYTES && bytes[0] === MARKER_PREFIX && bytes[1] === SOI;
}

function readSegment(bytes: Uint8Array, offset: number): Segment {
  if (bytes[offset] !== MARKER_PREFIX) throw new ExifStripError('malformed');
  let codeIndex = offset + 1;
  while (bytes[codeIndex] === MARKER_PREFIX) codeIndex += 1;
  const code = bytes[codeIndex];
  if (code === undefined) throw new ExifStripError('malformed');
  if (code === MARKER_EOI || code === MARKER_SOS) return { start: offset, code, end: bytes.length };
  if (isStandalone(code)) return { start: offset, code, end: codeIndex + 1 };
  const lengthIndex = codeIndex + 1;
  const length = readUint16(bytes, lengthIndex);
  // The length field counts itself, so it must be at least 2 and the payload ends at lengthIndex + length.
  if (length < MIN_SEGMENT_LENGTH) throw new ExifStripError('malformed');
  const end = lengthIndex + length;
  if (end > bytes.length) throw new ExifStripError('malformed');
  return { start: offset, code, end };
}

/** Markers without a length field: TEM (0x01) and RST0-RST7 (0xD0-0xD7). */
function isStandalone(code: number): boolean {
  return code === 0x01 || (code >= 0xd0 && code <= 0xd7);
}

function readUint16(bytes: Uint8Array, index: number): number {
  const high = bytes[index];
  const low = bytes[index + 1];
  if (high === undefined || low === undefined) throw new ExifStripError('malformed');
  return (high << 8) | low;
}

function concat(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
