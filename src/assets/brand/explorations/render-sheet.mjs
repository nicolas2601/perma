// Render one concept at 512/64/32/16 (light + dark) and mono silhouette; compose a labelled sheet with ImageMagick.
// Usage: node render-sheet.mjs <module.mjs> <name>
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { argv, stdout } from 'node:process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [modPath, name] = argv.slice(2);
const out = join(tmpdir(), 'perma-brand-explorations', name);
mkdirSync(out, { recursive: true });
const mod = await import(pathToFileURL(resolve(modPath)).href);
const VARIANTS = {
  light: { ink: '#1f2b2a', accent: '#006779', bg: '#f2f5f4', sizes: [512, 64, 32, 16] },
  dark: { ink: '#e8eeec', accent: '#4fb3c4', bg: '#0e1412', sizes: [512, 64, 32, 16] },
  mono: { ink: '#1f2b2a', accent: '#1f2b2a', bg: '#ffffff', sizes: [64, 16] },
};
for (const [vn, v] of Object.entries(VARIANTS)) {
  const svgPath = join(out, `${vn}.svg`);
  writeFileSync(svgPath, mod.build({ ink: v.ink, accent: v.accent, tile: true, tileFill: v.bg }));
  for (const s of v.sizes) {
    execFileSync('rsvg-convert', ['-w', String(s), '-h', String(s), svgPath, '-o', join(out, `${vn}-${s}.png`)]);
  }
}
const f = (...p) => join(out, p.join('-') + '.png');
const sheet = join(out, `${name}-sheet.png`);
execFileSync('magick', [
  '-background', '#ffffff', '-gravity', 'center',
  f('light', 512), '(', f('light', 64), f('light', 32), f('light', 16), '+append', ')',
  '(', f('dark', 64), f('dark', 32), f('dark', 16), '+append', ')',
  '(', f('mono', 64), f('mono', 16), '+append', ')',
  '+append', sheet,
]);
stdout.write(`${sheet}\n`);
