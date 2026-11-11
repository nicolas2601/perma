// Replays of REAL captured API responses (fixtures/api/*.json). Nothing here is invented: when a capture
// is missing the loader returns null and the caller reports the capability as unavailable.
// Capture files are produced by the real v10.x models on public images; see docs/api-notes.md.
type Loader = () => Promise<unknown>;

/**
 * Globs are registered only in mock builds (VITE_INFERENCE=mock). In production the branch is dead code,
 * so no capture JSON reaches the bundle.
 */
function mockCaptures(): {
  analyze: Record<string, Loader>;
  tone: Record<string, Loader>;
  predictMocoBase: Record<string, Loader>;
} {
  if (import.meta.env.VITE_INFERENCE !== 'mock') return { analyze: {}, tone: {}, predictMocoBase: {} };
  return {
    analyze: import.meta.glob<unknown>('../../../fixtures/api/analyze-*.json', { import: 'default' }),
    tone: import.meta.glob<unknown>('../../../fixtures/api/simulate-tone-*.json', { import: 'default' }),
    predictMocoBase: import.meta.glob<unknown>('../../../fixtures/api/predict-MOCO_HAM7-base.json', {
      import: 'default',
    }),
  };
}

/** Deterministic pick: the alphabetically first file whose name contains `needle`. */
function firstCapture(captures: Record<string, Loader>, needle: string): Loader | null {
  const key = Object.keys(captures)
    .filter((path) => path.includes(needle))
    .sort()[0];
  return key === undefined ? null : (captures[key] ?? null);
}

async function replay(loader: Loader | null): Promise<unknown | null> {
  return loader === null ? null : loader();
}

export function loadAnalyzeCapture(): Promise<unknown | null> {
  return replay(firstCapture(mockCaptures().analyze, '/analyze-'));
}

export function loadSimulateToneCapture(deltaL: number): Promise<unknown | null> {
  return replay(firstCapture(mockCaptures().tone, `/simulate-tone-${deltaL}-`));
}

export function loadPredictMocoBaseCapture(): Promise<unknown | null> {
  return replay(firstCapture(mockCaptures().predictMocoBase, 'predict-MOCO_HAM7-base'));
}
