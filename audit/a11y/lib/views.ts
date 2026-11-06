import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface ManifestView {
  readonly nodeId: string;
  readonly phase: string;
  readonly view: string;
  readonly route: string;
  readonly state: string;
}

const MANIFEST_PATH = fileURLToPath(new URL('../../../docs/figma-manifest.json', import.meta.url));
const SAMPLE_CLASS = 'nv';
const SEEDED_STATES: ReadonlySet<string> = new Set([
  'result',
  'inspecting',
  'abcde',
  'compare',
  'exporting',
  'exported',
]);

export function loadViews(): ManifestView[] {
  const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as { views: ManifestView[] };
  return parsed.views;
}

export function runLabel(): string {
  return process.env.A11Y_RUN ?? 'mock';
}

/** DEV seed is requested only in the dev run and only for states that need a result. */
export function viewUrl(view: ManifestView): string {
  const path = view.route.replace(':clase', SAMPLE_CLASS);
  if (runLabel() !== 'dev' || !SEEDED_STATES.has(view.state)) return path;
  return `${path}${path.includes('?') ? '&' : '?'}seed=result`;
}

export function slugOf(route: string): string {
  return route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
}
