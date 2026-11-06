import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Vitest runs from the repository root; jsdom makes import.meta.url non-file, so avoid it here.
const SCRIPT = join(process.cwd(), 'scripts', 'check-no-msw-in-dist.mjs');

interface RunResult {
  code: number;
  stderr: string;
}

function runGuard(dir: string): Promise<RunResult> {
  return new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, dir], (error, _stdout, stderr) => {
      const code = error && typeof error.code === 'number' ? error.code : 0;
      resolve({ code, stderr });
    });
  });
}

describe('check-no-msw-in-dist', () => {
  let dist: string;

  beforeEach(async () => {
    dist = await mkdtemp(join(tmpdir(), 'perma-dist-'));
    await mkdir(join(dist, 'assets'), { recursive: true });
  });

  afterEach(async () => {
    await rm(dist, { recursive: true, force: true });
  });

  it('exits 0 for a clean bundle', async () => {
    await writeFile(join(dist, 'assets', 'index-abc.js'), 'console.log("production app");');
    await writeFile(join(dist, 'index.html'), '<html></html>');
    expect((await runGuard(dist)).code).toBe(0);
  });

  it('exits 1 when mockServiceWorker appears in a JS chunk', async () => {
    await writeFile(join(dist, 'assets', 'index-abc.js'), 'fetch("/mockServiceWorker.js")');
    const result = await runGuard(dist);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('mockServiceWorker');
  });

  it('exits 1 when a standalone msw identifier appears in an HTML file', async () => {
    await writeFile(join(dist, 'index.html'), '<script>window.msw = true</script>');
    expect((await runGuard(dist)).code).toBe(1);
  });

  it('exits 1 when MSW setup functions appear in the bundle', async () => {
    await writeFile(join(dist, 'assets', 'index-abc.js'), 'const w = setupWorker(handlers);');
    expect((await runGuard(dist)).code).toBe(1);
  });

  it('does not flag unrelated words that merely contain the letters msw', async () => {
    await writeFile(join(dist, 'assets', 'index-abc.js'), 'const mswitch = 1; const umsway = 2;');
    expect((await runGuard(dist)).code).toBe(0);
  });

  it('ignores binary assets even if their bytes contain the pattern', async () => {
    await writeFile(join(dist, 'assets', 'font.woff2'), 'mockServiceWorker');
    expect((await runGuard(dist)).code).toBe(0);
  });

  it('fails closed (exit 2) when the directory does not exist', async () => {
    expect((await runGuard(join(dist, 'missing'))).code).toBe(2);
  });
});
