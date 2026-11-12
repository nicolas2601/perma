import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLabel } from './views';

const AUDIT_ROOT = fileURLToPath(new URL('../', import.meta.url));

/** Writes one JSON evidence record under audit/a11y/results/<run>/<relPath>. */
export function saveJson(relPath: string, data: unknown): string {
  const file = join(AUDIT_ROOT, 'results', runLabel(), relPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

/** Screenshot path under audit/a11y/screenshots/<run>/. */
export function screenshotPath(name: string): string {
  const file = join(AUDIT_ROOT, 'screenshots', runLabel(), name);
  mkdirSync(dirname(file), { recursive: true });
  return file;
}
