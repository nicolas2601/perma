import { describe, expect, it } from 'vitest';
import { copy } from '../../../src/app/pwa/copy';

const EMOJI = /\p{Extended_Pictographic}/u;

describe('PWA copy', () => {
  it('has identical keys in es and en, with non-empty values', () => {
    const esKeys = Object.keys(copy.es).sort();
    expect(Object.keys(copy.en).sort()).toEqual(esKeys);
    for (const key of esKeys) {
      expect(copy.es[key as keyof typeof copy.es]).not.toBe('');
      expect(copy.en[key as keyof typeof copy.en]).not.toBe('');
    }
  });

  it('contains no emoji or pictographic characters', () => {
    for (const table of [copy.es, copy.en]) {
      for (const value of Object.values(table)) {
        expect(value).not.toMatch(EMOJI);
      }
    }
  });

  it('states that image analysis needs the network, in both locales', () => {
    expect(copy.es.offlineReady).toContain('requiere conexión a la red');
    expect(copy.en.offlineReady).toContain('needs a network connection');
  });
});
