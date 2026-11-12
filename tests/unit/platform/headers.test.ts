import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest runs from the repository root; jsdom makes import.meta.url non-file, so avoid it here.
const HEADERS_PATH = join(process.cwd(), 'public', '_headers');

/** Parses the Netlify/Cloudflare `_headers` format into path -> { header: value }. */
function parseHeaders(source: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>();
  let current: Record<string, string> | null = null;
  for (const raw of source.split('\n')) {
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue;
    if (!raw.startsWith(' ') && !raw.startsWith('\t')) {
      current = {};
      rules.set(raw.trim(), current);
      continue;
    }
    const separator = raw.indexOf(':');
    if (current === null || separator < 0) continue;
    current[raw.slice(0, separator).trim().toLowerCase()] = raw.slice(separator + 1).trim();
  }
  return rules;
}

const headers = readFileSync(HEADERS_PATH, 'utf8');
const rules = parseHeaders(headers);
const globalHeaders = rules.get('/*') ?? {};

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...values] = part.split(/\s+/);
        return [name ?? '', values] as const;
      }),
  );
}

describe('public/_headers', () => {
  const csp = directives(globalHeaders['content-security-policy'] ?? '');

  it('sets a CSP that keeps everything same-origin and forbids inline eval', () => {
    expect(csp.get('default-src')).toEqual(["'self'"]);
    expect(csp.get('script-src')).toEqual(["'self'"]);
    expect(csp.get('connect-src')).toEqual(["'self'"]);
    expect(csp.get('img-src')).toEqual(["'self'", 'blob:', 'data:']);
    expect(csp.get('worker-src')).toEqual(["'self'", 'blob:']);
    expect(headers).not.toMatch(/unsafe-eval/);
    expect(csp.get('script-src')).not.toContain("'unsafe-inline'");
  });

  it('restricts object embedding and framing', () => {
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('allows the camera only for this origin', () => {
    expect(globalHeaders['permissions-policy']).toContain('camera=(self)');
  });

  it('uses a conservative referrer policy', () => {
    expect(globalHeaders['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('never caches the shell entry point or the service worker', () => {
    expect(rules.get('/index.html')?.['cache-control']).toBe('no-store');
    expect(rules.get('/sw.js')?.['cache-control']).toBe('no-store');
    expect(rules.get('/api/*')?.['cache-control']).toBe('no-store');
  });

  it('caches only content-hashed assets as immutable', () => {
    expect(rules.get('/assets/*')?.['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(rules.get('/workbox-*.js')?.['cache-control']).toContain('immutable');
  });
});
