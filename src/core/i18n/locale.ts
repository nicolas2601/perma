import type { Locale } from './contract';

export const LOCALE_STORAGE_KEY = 'perma.locale';
export const DEFAULT_LOCALE: Locale = 'es';

export function isLocale(value: unknown): value is Locale {
  return value === 'es' || value === 'en';
}

/** A stored choice wins. Otherwise an English browser gets English; everything else gets Spanish. */
export function detectLocale(navigatorLanguage: string | undefined, stored: string | null): Locale {
  if (isLocale(stored)) return stored;
  return navigatorLanguage?.toLowerCase().startsWith('en') === true ? 'en' : DEFAULT_LOCALE;
}

type LocaleStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Accessing localStorage itself can throw in sandboxed frames. */
export function browserLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** localStorage can throw (private mode, quota, disabled storage). Failing to persist is not fatal. */
export function readStoredLocale(storage: Pick<LocaleStorage, 'getItem'> | undefined): string | null {
  try {
    return storage?.getItem(LOCALE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(storage: Pick<LocaleStorage, 'setItem'> | undefined, locale: Locale): void {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Persistence is best effort; the in-memory choice still applies for this session.
  }
}
