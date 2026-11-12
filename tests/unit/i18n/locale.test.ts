import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  detectLocale,
  LOCALE_STORAGE_KEY,
  readStoredLocale,
  writeStoredLocale,
} from '@/core/i18n/locale';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    data,
  };
}

describe('detectLocale', () => {
  it('defaults to Spanish for non-English browsers', () => {
    expect(detectLocale('es-CO', null)).toBe('es');
    expect(detectLocale('fr-FR', null)).toBe(DEFAULT_LOCALE);
    expect(detectLocale(undefined, null)).toBe('es');
  });

  it('detects English from navigator.language', () => {
    expect(detectLocale('en-US', null)).toBe('en');
    expect(detectLocale('EN-gb', null)).toBe('en');
  });

  it('lets a stored choice win over the browser language', () => {
    expect(detectLocale('en-US', 'es')).toBe('es');
    expect(detectLocale('es-CO', 'en')).toBe('en');
  });

  it('ignores a stored value that is not a supported locale', () => {
    expect(detectLocale('en-US', 'de')).toBe('en');
  });
});

describe('locale persistence', () => {
  it('writes and reads the choice under the documented key', () => {
    const storage = memoryStorage();
    writeStoredLocale(storage, 'en');
    expect(storage.data.get(LOCALE_STORAGE_KEY)).toBe('en');
    expect(readStoredLocale(storage)).toBe('en');
  });

  it('survives a storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(readStoredLocale(throwing)).toBeNull();
    expect(() => writeStoredLocale(throwing, 'en')).not.toThrow();
  });

  it('treats missing storage as no stored choice', () => {
    expect(readStoredLocale(undefined)).toBeNull();
    expect(() => writeStoredLocale(undefined, 'es')).not.toThrow();
  });
});
