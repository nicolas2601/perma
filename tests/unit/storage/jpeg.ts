const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];
const SOS_HEADER = [0xff, 0xda, 0x00, 0x03, 0x01];
const SCAN_DATA = [0xaa, 0xbb, 0xcc];
const APP0 = 0xe0;
const APP1 = 0xe1;
const DQT = 0xdb;

export const GPS_MARKER = 'GPSLatitude=4.6097';

export function ascii(text: string): number[] {
  return Array.from(text, (char) => char.charCodeAt(0));
}

/** A JPEG segment: 0xFF, code, 2-byte length (counts itself), payload. */
export function segment(code: number, payload: readonly number[]): number[] {
  const length = payload.length + 2;
  return [0xff, code, length >> 8, length & 0xff, ...payload];
}

/** Minimal JPEG: SOI, APP0, optional APP1 carrying GPS, DQT, SOS with scan data, EOI. */
export function fakeJpeg({ withGps }: { withGps: boolean }): Uint8Array<ArrayBuffer> {
  const app1 = withGps ? segment(APP1, [...ascii('Exif\0\0'), ...ascii(GPS_MARKER)]) : [];
  return Uint8Array.from([
    ...SOI,
    ...segment(APP0, ascii('JFIF\0')),
    ...app1,
    ...segment(DQT, [0x00, 0x01, 0x02]),
    ...SOS_HEADER,
    ...SCAN_DATA,
    ...EOI,
  ]);
}

/** The same JPEG without any APP1 segment: the expected output of stripping. */
export function fakeJpegWithoutApp1(): Uint8Array<ArrayBuffer> {
  return fakeJpeg({ withGps: false });
}

export function containsAscii(bytes: Uint8Array, text: string): boolean {
  return Buffer.from(bytes).includes(Buffer.from(text, 'latin1'));
}
