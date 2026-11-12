import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from './contract';
import { copyRegistry, qualify, translate, type CopyDictionary, type CopyKey } from './registry';
import {
  browserLocalStorage,
  detectLocale,
  readStoredLocale,
  writeStoredLocale,
} from './locale';

export interface I18nValue {
  locale: Locale;
  setLocale(locale: Locale): void;
  t: (key: CopyKey) => string;
  dictionary: CopyDictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  dictionary?: CopyDictionary;
  storage?: Storage;
  navigatorLanguage?: string;
}

/**
 * Hot locale switch: only the copy re-renders. Exam data lives in its own store
 * and is not touched, so switching language never changes the record or the ack.
 */
export function I18nProvider({
  children,
  dictionary = copyRegistry,
  storage = browserLocalStorage(),
  navigatorLanguage = globalThis.navigator?.language,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    detectLocale(navigatorLanguage, readStoredLocale(storage)),
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      writeStoredLocale(storage, next);
      setLocaleState(next);
    },
    [storage],
  );

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => translate(dictionary, locale, key),
      dictionary,
    }),
    [dictionary, locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (value === null) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

/** `useT('compare')` resolves `compare.<key>` first, then the bare core key. */
export function useT(namespace = ''): (key: string) => string {
  const { locale, dictionary } = useI18n();
  return useCallback(
    (key: string) => {
      const qualified = qualify(namespace, key);
      const hit = dictionary[locale][qualified] ?? dictionary.es[qualified];
      return hit ?? translate(dictionary, locale, key);
    },
    [dictionary, locale, namespace],
  );
}
