// Loads the app's own capture modules (TypeScript) into Node through Vite's SSR loader, so the trainer and
// the timing bench run exactly the code the PWA ships. No network: files are read from the repository.
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CORE_MODULES = [
  'advice-policy',
  'blur-features',
  'blur-model',
  'constants',
  'frame',
  'frame-pipeline',
  'luma',
  'rules',
  'signals',
  'worker-handler',
];

/** Returns { core, close }. `core[name]` is the exports object of src/core/capture/<name>.ts. */
export async function loadCore() {
  const server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const core = {};
    for (const name of CORE_MODULES) {
      core[name] = await server.ssrLoadModule(`/src/core/capture/${name}.ts`);
    }
    return { core, close: () => server.close() };
  } catch (error) {
    await server.close();
    throw error;
  }
}
