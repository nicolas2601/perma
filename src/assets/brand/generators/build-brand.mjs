// Regenerates the PERMA brand files from the mark geometry. Run: node src/assets/brand/generators/build-brand.mjs
// Needs rsvg-convert (librsvg) and ImageMagick (magick, WebP) on PATH. Nothing is downloaded or sent anywhere.
// After a build, run svg-craft optimize.mjs (static profile) on the SVGs and lint them before committing.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bleedSvg, lockupSvg, markSvg, ogSvg, tileSvg } from './compose.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..', '..', '..');
const outlines = JSON.parse(readFileSync(join(here, 'wordmark.json'), 'utf8'));
const { wordmark, tagline } = outlines;

const MASKABLE_SCALE = 0.8; // glyph corner stays inside the 80 % safe circle (radius 0.4 of the size)
const APPLE_SCALE = 0.8;

const SVG_OUTPUTS = {
  'src/assets/brand/perma-mark.svg': markSvg(),
  'src/assets/brand/perma-logo-horizontal.svg': lockupSvg({ wordmark }),
  'src/assets/brand/perma-logo-mono.svg': lockupSvg({ wordmark, mono: true }),
  'public/favicon.svg': tileSvg(),
};

const work = mkdtempSync(join(tmpdir(), 'perma-brand-'));

/** Rasterises one SVG markup string to a PNG of w x h, via rsvg-convert. */
function raster(name, svg, w, h, outPath) {
  const src = join(work, `${name}.svg`);
  writeFileSync(src, svg);
  execFileSync('rsvg-convert', ['-w', String(w), '-h', String(h), src, '-o', outPath], { cwd: work });
}

function writeSquarePng(rel, svg, size) {
  raster(rel.replace(/\W+/g, '-'), svg, size, size, join(root, rel));
}

try {
  for (const [rel, svg] of Object.entries(SVG_OUTPUTS)) writeFileSync(join(root, rel), svg);
  writeSquarePng('public/icons/pwa-192.png', tileSvg(), 192);
  writeSquarePng('public/icons/pwa-512.png', tileSvg(), 512);
  writeSquarePng('public/icons/pwa-maskable-512.png', bleedSvg(MASKABLE_SCALE), 512);
  writeSquarePng('public/icons/apple-touch-icon-180.png', bleedSvg(APPLE_SCALE), 180);
  const og = join(work, 'og.png');
  raster('og', ogSvg({ wordmark, tagline }), 1200, 630, og);
  execFileSync('magick', [og, '-quality', '90', join(root, 'public/og-image.webp')]);
} finally {
  rmSync(work, { recursive: true, force: true });
}
