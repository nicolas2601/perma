import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanSource, scanTree } from './forbiddenPatterns';

const SRC_ROOT = resolve(process.cwd(), 'src');

describe('forbidden motion patterns (lint-style scan of src)', () => {
  it('finds no animated counters, scan loops, fake waits, transition:all or scale(0) in src', () => {
    expect(scanTree(SRC_ROOT)).toEqual([]);
  });

  it('detects each forbidden pattern in the scanner itself', () => {
    const ids = (content: string, file = 'src/components/Fixture.tsx') => scanSource(file, content).map((v) => v.id);
    expect(ids('transition: all 200ms ease')).toEqual(['transition-all']);
    expect(ids('transition-property: all;', 'src/app/x.css')).toEqual(['transition-all']);
    expect(ids('transform: scale(0);', 'src/app/x.css')).toEqual(['scale-from-zero']);
    expect(ids('const v = useCounter(score);')).toEqual(['animated-counter']);
    expect(ids('function scanLoop() {}')).toEqual(['scan-loop']);
    expect(ids('await new Promise((resolve) => setTimeout(resolve, 800));', 'src/motion/x.ts')).toEqual(['fake-wait']);
    expect(ids('animate(x, 1, { repeat: Infinity })', 'src/motion/x.ts')).toEqual(['infinite-decorative-loop']);
  });

  it('does not flag legitimate values', () => {
    const file = 'src/motion/x.ts';
    expect(scanSource(file, 'transform: scale(0.97);')).toEqual([]);
    expect(scanSource(file, 'transition-property: transform, opacity;')).toEqual([]);
    expect(scanSource(file, 'scale: 0.97')).toEqual([]);
    expect(scanSource(file, 'transition: opacity 100ms;')).toEqual([]);
  });

  it('applies the fake-wait rule only inside the motion layer', () => {
    const slowMock = 'await new Promise((resolve) => setTimeout(resolve, 8000));';
    expect(scanSource('src/core/inference/mock.ts', slowMock)).toEqual([]);
    expect(scanSource('src/motion/x.ts', slowMock).map((v) => v.id)).toEqual(['fake-wait']);
  });
});
