import { describe, expect, it } from 'vitest';
import { removePngMetadata, removeWebpMetadata, stripImageMetadata } from '@/core/storage/metadata';

const enc = (text: string) => Uint8Array.from([...text].map((c) => c.charCodeAt(0)));
const u32be = (n: number) => Uint8Array.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
const u32le = (n: number) => Uint8Array.from([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
const join = (...parts: Uint8Array[]) => Uint8Array.from(parts.flatMap((p) => [...p]));
const pngChunk = (type: string, data: number[]) => join(u32be(data.length), enc(type), Uint8Array.from(data), u32be(0));

describe('image metadata stripping', () => {
  it('removes eXIf and text chunks from PNG and keeps pixel chunks', () => {
    const png = join(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      pngChunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
      pngChunk('eXIf', [1, 2, 3]),
      pngChunk('iTXt', [4, 5]),
      pngChunk('IDAT', [9, 9]),
      pngChunk('IEND', []),
    );
    const out = removePngMetadata(png);
    const text = String.fromCharCode(...out);
    expect(text).not.toContain('eXIf');
    expect(text).not.toContain('iTXt');
    expect(text).toContain('IDAT');
  });

  it('removes EXIF and XMP chunks from WebP, clears VP8X flags and fixes the RIFF size', () => {
    const chunk = (type: string, data: number[]) =>
      join(enc(type), u32le(data.length), Uint8Array.from(data), data.length % 2 ? Uint8Array.from([0]) : new Uint8Array());
    const body = join(enc('WEBP'), chunk('VP8X', [0x0c, 0, 0, 0, 0, 0, 0, 0, 0, 0]), chunk('EXIF', [1, 2, 3]), chunk('XMP ', [4]), chunk('VP8 ', [7, 7]));
    const webp = join(enc('RIFF'), u32le(body.length), body);
    const out = removeWebpMetadata(webp);
    const text = String.fromCharCode(...out);
    expect(text).not.toContain('EXIF');
    expect(text).not.toContain('XMP ');
    expect(text).toContain('VP8 ');
    expect(new DataView(out.buffer).getUint32(4, true)).toBe(out.length - 8);
    expect(out[20]! & 0x0c).toBe(0);
  });

  it('rejects unknown containers', async () => {
    await expect(stripImageMetadata(new Blob([enc('<svg/>')]))).rejects.toMatchObject({ reason: 'not-jpeg' });
  });
});
