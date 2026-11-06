import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest runs from the repository root (same convention as headers.test.ts).
const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, 'public');
const PNG_SIGNATURE = '89504e470d0a1a0a';
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;

/** Reads width and height from the IHDR chunk of a PNG (the first chunk, bytes 16-23). */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  expect(bytes.subarray(0, 8).toString('hex'), `${file} is not a PNG`).toBe(PNG_SIGNATURE);
  return { width: bytes.readUInt32BE(IHDR_WIDTH_OFFSET), height: bytes.readUInt32BE(IHDR_HEIGHT_OFFSET) };
}

/** Public-root path ("/icons/x.png") to absolute file path. */
function publicFile(urlPath: string): string {
  return join(PUBLIC_DIR, urlPath.replace(/^\//, ''));
}

const indexHtml = readFileSync(join(ROOT, 'index.html'), 'utf8');
const viteConfig = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');

/** Every <link href> in index.html that points to an image (favicon, apple-touch-icon, etc.). */
function htmlIconHrefs(): string[] {
  return [...indexHtml.matchAll(/<link\s[^>]*href="([^"]+)"[^>]*>/g)]
    .map((match) => match[1] ?? '')
    .filter((href) => /\.(svg|png|webp|ico)$/.test(href));
}

/** Manifest icons declared in vite.config.ts as { src, sizes }. */
function manifestIcons(): { src: string; width: number; height: number }[] {
  return [...viteConfig.matchAll(/src: '([^']+)', sizes: '(\d+)x(\d+)'/g)].map((match) => ({
    src: match[1] ?? '',
    width: Number(match[2]),
    height: Number(match[3]),
  }));
}

describe('brand assets referenced by the app', () => {
  it('finds the icon links in index.html and the manifest icons in vite.config.ts', () => {
    expect(htmlIconHrefs().length).toBeGreaterThan(0);
    expect(manifestIcons().length).toBe(3);
  });

  it.each(htmlIconHrefs())('index.html icon %s exists under public/', (href) => {
    expect(existsSync(publicFile(href))).toBe(true);
  });

  it.each(manifestIcons())('manifest icon $src exists and is $width x $height', ({ src, width, height }) => {
    expect(existsSync(publicFile(src))).toBe(true);
    expect(pngSize(publicFile(src))).toEqual({ width, height });
  });

  it.each([
    ['/icons/pwa-192.png', 192],
    ['/icons/pwa-512.png', 512],
    ['/icons/pwa-maskable-512.png', 512],
    ['/icons/apple-touch-icon-180.png', 180],
  ])('%s is exactly %i x %i px', (src, size) => {
    expect(pngSize(publicFile(src))).toEqual({ width: size, height: size });
  });

  it('keeps the apple-touch icon opaque (iOS applies its own mask)', () => {
    // Colour type is byte 25 of the IHDR; 4 (grey+alpha) and 6 (RGBA) carry alpha.
    const colourType = readFileSync(publicFile('/icons/apple-touch-icon-180.png'))[25];
    expect([4, 6]).not.toContain(colourType);
  });

  it('ships the 1200 x 630 social card as WebP', () => {
    const bytes = readFileSync(publicFile('/og-image.webp'));
    expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(bytes.subarray(8, 12).toString('ascii')).toBe('WEBP');
  });

  it.each([
    'src/assets/brand/perma-mark.svg',
    'src/assets/brand/perma-logo-horizontal.svg',
    'src/assets/brand/perma-logo-mono.svg',
    'public/favicon.svg',
  ])('%s has an accessible title and no dangling aria-labelledby', (rel) => {
    const svg = readFileSync(join(ROOT, rel), 'utf8');
    expect(svg).toMatch(/<title>[^<]+<\/title>/);
    expect(svg).not.toContain('aria-labelledby');
  });
});
