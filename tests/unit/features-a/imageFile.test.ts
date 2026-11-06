import { describe, expect, it } from 'vitest';
import {
  ImageRejectedError,
  MAX_FILE_BYTES,
  checkMegapixels,
  fitWithin,
  prepareExamImage,
  validateImageFile,
} from '@/features/desk/imageFile';
import { isLowResolution } from '@/features/desk/imageSource';

function reasonOf(fn: () => void): string | undefined {
  try {
    fn();
    return undefined;
  } catch (error) {
    return error instanceof ImageRejectedError ? error.reason : 'other';
  }
}

describe('validateImageFile', () => {
  it('accepts JPEG, PNG and WebP within the size limit', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(reasonOf(() => validateImageFile({ type, size: 1024 }))).toBeUndefined();
    }
  });

  it('rejects HEIC and other types with reason "type"', () => {
    expect(reasonOf(() => validateImageFile({ type: 'image/heic', size: 1024 }))).toBe('type');
  });

  it('rejects empty files and files over 10 MiB with reason "size"', () => {
    expect(reasonOf(() => validateImageFile({ type: 'image/png', size: 0 }))).toBe('size');
    expect(reasonOf(() => validateImageFile({ type: 'image/png', size: MAX_FILE_BYTES + 1 }))).toBe('size');
  });

  it('prepareExamImage fails fast on a bad type without decoding', async () => {
    const bad = new Blob(['x'], { type: 'text/plain' });
    await expect(prepareExamImage(bad, { name: 'x.txt', origin: 'file' })).rejects.toMatchObject({ reason: 'type' });
  });
});

describe('dimensions', () => {
  it('rejects more than 20 megapixels', () => {
    expect(reasonOf(() => checkMegapixels(5000, 4001))).toBe('megapixels');
    expect(reasonOf(() => checkMegapixels(5000, 4000))).toBeUndefined();
  });

  it('fitWithin keeps aspect ratio and never upscales', () => {
    expect(fitWithin(3200, 1600, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitWithin(600, 443, 1600)).toEqual({ width: 600, height: 443 });
  });

  it('flags a short side under 300 px as low resolution', () => {
    expect(isLowResolution(299, 800)).toBe(true);
    expect(isLowResolution(300, 800)).toBe(false);
  });
});
