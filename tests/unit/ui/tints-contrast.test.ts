import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/* Vitest runs from the repo root; jsdom does not expose a file: import.meta.url, so resolve from cwd. */
const TOKENS = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
const TINT_NAMES = ['mint', 'sky', 'butter', 'blush', 'lilac'] as const;
const MIN_TEXT_CONTRAST = 4.5;

function tokenHex(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(TOKENS);
  if (!match?.[1]) throw new Error(`token --${name} not found in tokens.css`);
  return match[1];
}

function channelLuminance(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.slice(1);
  const [r, g, b] = [0, 2, 4].map((offset) => channelLuminance(Number.parseInt(value.slice(offset, offset + 2), 16)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe('soft tints in tokens.css', () => {
  it.each(TINT_NAMES)('%s: deep tone and ink both reach 4.5:1 on the tint', (name) => {
    const tint = tokenHex(`tint-${name}`);
    expect(contrastRatio(tokenHex(`deep-${name}`), tint)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(tokenHex('ink'), tint)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('keeps the existing tokens intact', () => {
    expect(tokenHex('accent')).toBe('#006779');
    expect(tokenHex('ink')).toBe('#1f2b2a');
    expect(tokenHex('canvas')).toBe('#f2f5f4');
  });
});
