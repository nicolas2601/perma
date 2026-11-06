// Downloads the non-clinical source photographs used by the camera fixtures (Wikimedia Commons, CC0 or
// public domain). Licence metadata is read from the Commons API and recorded with a sha256 manifest.
// Usage: node scripts/camera/fetch-cc0-sources.mjs [outDir=/tmp/camera-bench/sources]
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = process.argv[2] ?? '/tmp/camera-bench/sources';
const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'perma-camera-bench/0.1 (non-clinical fixtures; contact via repo)' };

// role: 'calib' feeds threshold tuning; 'holdout' is never used to choose a threshold.
const SOURCES = [
  { id: 'cat', role: 'calib', kind: 'subject', file: 'Tabby cat with blue eyes-3336579.jpg' },
  { id: 'gravel', role: 'calib', kind: 'texture', file: 'Gray Gravel Rock Texture by Photos Public Domain.jpg' },
  { id: 'coffee', role: 'holdout', kind: 'subject', file: 'Cup of coffee in Café Butter - Prenzlauer Berg, Berlin.jpg' },
  { id: 'sand', role: 'holdout', kind: 'texture', file: 'Sand Rock Texture.jpg' },
  // Test set: never used to choose any threshold. Frozen rules are scored on it once.
  { id: 'cat2', role: 'test', kind: 'subject', file: 'Domestic cat 2019 G1.jpg' },
  { id: 'granite', role: 'test', kind: 'texture', file: 'Light grey granite rock seamless stone surface texture.jpg' },
];

async function licenceOf(file) {
  const url = `${API}?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent(`File:${file}`)}`;
  const data = await (await fetch(url, { headers: UA })).json();
  const meta = data.query.pages[0].imageinfo[0].extmetadata;
  return { licence: meta.LicenseShortName?.value ?? '', artist: meta.Artist?.value ?? '' };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const manifest = [];
  for (const source of SOURCES) {
    const { licence, artist } = await licenceOf(source.file);
    if (!/CC0|Public domain/.test(licence)) throw new Error(`${source.file}: licence not CC0/PD (${licence})`);
    const thumb = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(source.file)}?width=1280`;
    const bytes = Buffer.from(await (await fetch(thumb, { headers: UA, redirect: 'follow' })).arrayBuffer());
    const path = join(OUT, `${source.id}.jpg`);
    await writeFile(path, bytes);
    manifest.push({
      id: source.id,
      role: source.role,
      kind: source.kind,
      file: source.file,
      licence,
      artist: artist.replace(/<[^>]+>/g, '').trim(),
      sourcePage: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(source.file)}`,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    process.stdout.write(`${source.id}: ${licence}, ${bytes.length} bytes\n`);
  }
  await writeFile(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

await main();
