import { describe, expect, it } from 'vitest';
import { ExifStripError, removeApp1Segments, stripExifLocation } from '@/core/storage/exif';
import { containsAscii, fakeJpeg, fakeJpegWithoutApp1, GPS_MARKER, segment } from './jpeg';

describe('removeApp1Segments', () => {
  it('removes the APP1 segment that carries GPS and keeps everything else byte for byte', () => {
    const withGps = fakeJpeg({ withGps: true });
    expect(containsAscii(withGps, GPS_MARKER)).toBe(true);

    const stripped = removeApp1Segments(withGps);

    expect(containsAscii(stripped, GPS_MARKER)).toBe(false);
    expect(Array.from(stripped)).toEqual(Array.from(fakeJpegWithoutApp1()));
  });

  it('returns identical bytes when there is no APP1 segment', () => {
    const clean = fakeJpegWithoutApp1();
    expect(Array.from(removeApp1Segments(clean))).toEqual(Array.from(clean));
  });

  it('keeps the pixel scan data after the SOS marker untouched', () => {
    const stripped = removeApp1Segments(fakeJpeg({ withGps: true }));
    const tail = Array.from(stripped.subarray(stripped.length - 5));
    expect(tail).toEqual([0xaa, 0xbb, 0xcc, 0xff, 0xd9]);
  });

  it('strips every APP1 segment, including XMP that can carry location', () => {
    const twoApp1 = Uint8Array.from([
      0xff, 0xd8,
      ...segment(0xe1, [...Array.from('Exif\0\0', (c) => c.charCodeAt(0))]),
      ...segment(0xe1, [...Array.from('http://ns.adobe.com/xap/1.0/\0', (c) => c.charCodeAt(0))]),
      0xff, 0xda, 0x00, 0x02, 0xff, 0xd9,
    ]);
    const stripped = removeApp1Segments(twoApp1);
    expect(Array.from(stripped)).toEqual([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
  });

  it('rejects non-JPEG input instead of guessing about the container', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => removeApp1Segments(png)).toThrow(ExifStripError);
    try {
      removeApp1Segments(png);
    } catch (error) {
      expect((error as ExifStripError).reason).toBe('not-jpeg');
    }
  });

  it('rejects a segment whose length field is smaller than the field itself', () => {
    const badLength = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x01, 0xff, 0xd9]);
    expect(() => removeApp1Segments(badLength)).toThrow(ExifStripError);
  });

  it('rejects a segment whose declared length runs past the end of the file', () => {
    const truncated = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0xff, 0x01]);
    try {
      removeApp1Segments(truncated);
      expect.unreachable('expected a malformed error');
    } catch (error) {
      expect(error).toBeInstanceOf(ExifStripError);
      expect((error as ExifStripError).reason).toBe('malformed');
    }
  });
});

describe('stripExifLocation', () => {
  it('returns a JPEG Blob without the GPS bytes', async () => {
    const blob = new Blob([fakeJpeg({ withGps: true })], { type: 'image/jpeg' });
    const clean = await stripExifLocation(blob);
    expect(clean.type).toBe('image/jpeg');
    const bytes = new Uint8Array(await clean.arrayBuffer());
    expect(containsAscii(bytes, GPS_MARKER)).toBe(false);
    expect(clean.size).toBeLessThan(blob.size);
  });

  it('surfaces a typed error for a non-JPEG blob', async () => {
    const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
    await expect(stripExifLocation(png)).rejects.toMatchObject({ name: 'ExifStripError', reason: 'not-jpeg' });
  });
});
