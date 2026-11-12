import { describe, expect, it } from 'vitest';
import { sniffImageType } from '@/features/desk/imageFile';

describe('sniffImageType', () => {
  it('recognizes jpeg, png and webp by magic bytes', () => {
    expect(sniffImageType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(
      sniffImageType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe('image/webp');
  });

  it('rejects html, svg and empty content regardless of declared type', () => {
    const encoder = new TextEncoder();
    expect(sniffImageType(encoder.encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    expect(sniffImageType(encoder.encode('<!doctype html>'))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
