/**
 * Copy contract: every feature owns `src/features/<name>/copy.ts` exporting
 * `export const copy = { es: {...}, en: {...} } as const` with identical keys.
 * Core-State merges them with import.meta.glob into one typed dictionary.
 */
export type Locale = 'es' | 'en';
export type CopyTable = Record<string, string>;
export interface FeatureCopy { es: CopyTable; en: CopyTable }
