import type { ExamImage } from '@/core/exam/contract';
import { stripExifLocation } from '@/core/storage/exif';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_MEGAPIXELS = 20;
export const UPLOAD_MAX_EDGE_PX = 1600;
export const UPLOAD_JPEG_QUALITY = 0.92;
const PIXELS_PER_MEGAPIXEL = 1_000_000;

export type ImageRejectReason = 'type' | 'size' | 'megapixels' | 'decode';

/** Typed rejection; the caller maps every reason to the `file-unavailable` recovery page. */
export class ImageRejectedError extends Error {
  constructor(readonly reason: ImageRejectReason, options?: ErrorOptions) {
    super(`image rejected: ${reason}`, options);
    this.name = 'ImageRejectedError';
  }
}

export function validateImageFile(file: Pick<File, 'type' | 'size'>): void {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageRejectedError('type');
  }
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    throw new ImageRejectedError('size');
  }
}

export function checkMegapixels(width: number, height: number): void {
  if (width * height > MAX_MEGAPIXELS * PIXELS_PER_MEGAPIXEL) {
    throw new ImageRejectedError('megapixels');
  }
}

/** Scales (w, h) so the longer edge is at most `maxEdge`, keeping aspect ratio. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

interface DecodedImage {
  width: number;
  height: number;
  source: CanvasImageSource & { close?: () => void };
}

async function decode(blob: Blob): Promise<DecodedImage> {
  try {
    const bitmap = await createImageBitmap(blob);
    return { width: bitmap.width, height: bitmap.height, source: bitmap };
  } catch (cause) {
    throw new ImageRejectedError('decode', { cause });
  }
}

/**
 * Re-encodes through a canvas. Canvas output carries no EXIF, so GPS and device
 * metadata of the original never reach the upload copy. The original is kept
 * untouched in memory for the viewer and is never uploaded.
 */
async function resizeForUpload(decoded: DecodedImage): Promise<Blob> {
  const { width, height } = fitWithin(decoded.width, decoded.height, UPLOAD_MAX_EDGE_PX);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageRejectedError('decode');
  ctx.drawImage(decoded.source, 0, 0, width, height);
  decoded.source.close?.();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageRejectedError('decode'))),
      'image/jpeg',
      UPLOAD_JPEG_QUALITY,
    );
  });
}

/**
 * Validates, decodes and prepares an image for the exam record. Throws ImageRejectedError.
 * The upload copy additionally goes through stripExifLocation (defense in depth on top of the re-encode).
 */
export async function prepareExamImage(
  original: Blob,
  meta: { name: string; origin: ExamImage['origin'] },
): Promise<ExamImage> {
  validateImageFile({ type: original.type, size: original.size });
  const decoded = await decode(original);
  checkMegapixels(decoded.width, decoded.height);
  const upload = await stripExifLocation(await resizeForUpload(decoded));
  return { original, upload, name: meta.name, origin: meta.origin };
}
