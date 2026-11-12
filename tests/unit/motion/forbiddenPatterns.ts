import { readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

export type PatternScope = 'all' | 'motion';

export interface ForbiddenPattern {
  readonly id: string;
  readonly scope: PatternScope;
  readonly pattern: RegExp;
}

/**
 * Brief prohibitions: animated score counters, scan loops, fake waits, and the global motion rules
 * (no transition:all, no scale(0), no infinite decorative loops).
 * Scope "motion" applies only to files that belong to the motion layer.
 */
export const FORBIDDEN_MOTION_PATTERNS: readonly ForbiddenPattern[] = [
  { id: 'transition-all', scope: 'all', pattern: /transition(?:-property)?\s*:\s*all\b/ },
  { id: 'scale-from-zero', scope: 'all', pattern: /scale\(\s*0\s*\)|scale:\s*0(?![.\d])/ },
  {
    id: 'animated-counter',
    scope: 'all',
    pattern: /\bcountUp\b|\bCountUp\b|count-up-\w+|useCounter\b|animateScore|scoreCounter|useAnimatedNumber/,
  },
  { id: 'scan-loop', scope: 'all', pattern: /\bscan(?:Loop|Line|Beam|Sweep)\b|scan-(?:loop|line|beam|sweep)/ },
  {
    id: 'fake-wait',
    scope: 'motion',
    pattern: /waitForTimeout|new Promise[^;]*setTimeout\(\s*\w+\s*,|\bsleep\s*\(|await\s+delay\s*\(/,
  },
  { id: 'infinite-decorative-loop', scope: 'motion', pattern: /repeat:\s*Infinity|iteration-count:\s*infinite/ },
];

export interface Violation {
  readonly file: string;
  readonly line: number;
  readonly id: string;
  readonly text: string;
}

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);

export function isMotionScope(file: string, content: string): boolean {
  const inMotionDir = file.split(/[\\/]/).includes('motion');
  return inMotionDir || /from\s+['"]motion\/react['"]/.test(content);
}

export function scanSource(file: string, content: string): Violation[] {
  const motionScope = isMotionScope(file, content);
  const active = FORBIDDEN_MOTION_PATTERNS.filter((rule) => rule.scope === 'all' || motionScope);
  const lines = content.split('\n');
  return lines.flatMap((text, index) =>
    active.filter((rule) => rule.pattern.test(text)).map((rule) => ({ file, line: index + 1, id: rule.id, text: text.trim() })),
  );
}

export function listSourceFiles(root: string): string[] {
  return readdirSync(root, { recursive: true })
    .map(String)
    .filter((name) => SCANNED_EXTENSIONS.has(extname(name)))
    .map((name) => join(root, name));
}

export function scanTree(root: string): Violation[] {
  return listSourceFiles(root).flatMap((path) => scanSource(path, readFileSync(path, 'utf8')));
}
