import { ExifStripError, removeApp1Segments } from './exif';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_CHUNK_OVERHEAD = 12; // length(4) + type(4) + crc(4)
const PNG_DROPPED = new Set(['eXIf', 'iTXt', 'tEXt', 'zTXt']);
const RIFF_HEADER = 12;
const WEBP_CHUNK_HEADER = 8;
const WEBP_DROPPED = new Set(['EXIF', 'XMP ']);
const VP8X_EXIF_AND_XMP_FLAGS = 0x08 | 0x04;

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length));
const readU32be = (bytes: Uint8Array, at: number): number =>
  ((bytes[at] ?? 0) * 2 ** 24) + (((bytes[at + 1] ?? 0) << 16) | ((bytes[at + 2] ?? 0) << 8) | (bytes[at + 3] ?? 0));
const readU32le = (bytes: Uint8Array, at: number): number =>
  (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8) | ((bytes[at + 2] ?? 0) << 16) | ((bytes[at + 3] ?? 0) * 2 ** 24);

function concat(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function removePngMetadata(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const kept: Uint8Array[] = [bytes.subarray(0, PNG_SIGNATURE.length)];
  let offset = PNG_SIGNATURE.length;
  while (offset < bytes.length) {
    const size = readU32be(bytes, offset);
    const end = offset + PNG_CHUNK_OVERHEAD + size;
    if (end > bytes.length) throw new ExifStripError('malformed');
    if (!PNG_DROPPED.has(ascii(bytes, offset + 4, 4))) kept.push(bytes.subarray(offset, end));
    offset = end;
  }
  return concat(kept);
}

export function removeWebpMetadata(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const kept: Uint8Array[] = [bytes.slice(0, RIFF_HEADER)];
  let offset = RIFF_HEADER;
  while (offset < bytes.length) {
    const size = readU32le(bytes, offset + 4);
    const end = offset + WEBP_CHUNK_HEADER + size + (size % 2);
    if (end > bytes.length + 1) throw new ExifStripError('malformed');
    const type = ascii(bytes, offset, 4);
    if (!WEBP_DROPPED.has(type)) {
      const chunk = bytes.slice(offset, Math.min(end, bytes.length));
      if (type === 'VP8X') chunk[WEBP_CHUNK_HEADER] = (chunk[WEBP_CHUNK_HEADER] ?? 0) & ~VP8X_EXIF_AND_XMP_FLAGS;
      kept.push(chunk);
    }
    offset = end;
  }
  const out = concat(kept);
  const view = new DataView(out.buffer);
  view.setUint32(4, out.length - WEBP_CHUNK_HEADER, true);
  return out;
}

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  signature.every((value, index) => bytes[index] === value);

/**
 * Removes location-bearing metadata from JPEG (APP1), PNG (eXIf, text chunks) and
 * WebP (EXIF, XMP). Pixel data is untouched, so the original stays unfiltered.
 * Anything else throws: this module does not guess about other containers.
 */
export async function stripImageMetadata(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (startsWith(bytes, [0xff, 0xd8])) return new Blob([removeApp1Segments(bytes)], { type: 'image/jpeg' });
  if (startsWith(bytes, PNG_SIGNATURE)) return new Blob([removePngMetadata(bytes)], { type: 'image/png' });
  const isWebp = ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP';
  if (isWebp) return new Blob([removeWebpMetadata(bytes)], { type: 'image/webp' });
  throw new ExifStripError('not-jpeg');
}
