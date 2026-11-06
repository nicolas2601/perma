import { z } from 'zod';
import { coreCopy, type CoreCopyKey } from './coreCopy';
import type { CopyTable, FeatureCopy, Locale } from './contract';

/** Typed from the core ES table. Feature keys join this union as their tables are typed. */
export type CopyKey = CoreCopyKey;

export type CopyDictionary = Record<Locale, CopyTable>;

export class CopyContractError extends Error {
  constructor(readonly source: string, message: string) {
    super(`Copy contract violated by ${source}: ${message}`);
    this.name = 'CopyContractError';
  }
}

const copyTableSchema = z.record(z.string(), z.string());
const featureCopySchema = z.object({
  copy: z.object({ es: copyTableSchema, en: copyTableSchema }),
});

/**
 * Merges core copy with every feature copy module. Each feature exports
 * `copy = { es, en }` with identical keys. A mismatch or duplicate key throws:
 * copy drift is a build error, not a runtime surprise.
 */
export function buildCopyRegistry(
  modules: Record<string, unknown>,
  core: FeatureCopy = coreCopy,
): CopyDictionary {
  const dictionary: CopyDictionary = { es: { ...core.es }, en: { ...core.en } };
  for (const [path, module] of Object.entries(modules)) {
    const { copy } = readFeatureCopy(path, module);
    assertSameKeys(path, copy);
    mergeInto(dictionary, path, copy);
  }
  return dictionary;
}

function readFeatureCopy(path: string, module: unknown): z.infer<typeof featureCopySchema> {
  const parsed = featureCopySchema.safeParse(module);
  if (!parsed.success) throw new CopyContractError(path, 'expected export `copy` with es and en tables');
  return parsed.data;
}

function assertSameKeys(path: string, copy: FeatureCopy): void {
  const es = Object.keys(copy.es).sort();
  const en = Object.keys(copy.en).sort();
  const onlyEs = es.filter((key) => !en.includes(key));
  const onlyEn = en.filter((key) => !es.includes(key));
  if (onlyEs.length > 0 || onlyEn.length > 0) {
    throw new CopyContractError(
      path,
      `ES/EN key mismatch (only es: [${onlyEs.join(', ')}], only en: [${onlyEn.join(', ')}])`,
    );
  }
}

function mergeInto(dictionary: CopyDictionary, path: string, copy: FeatureCopy): void {
  for (const key of Object.keys(copy.es)) {
    if (key in dictionary.es) throw new CopyContractError(path, `duplicate key "${key}"`);
  }
  Object.assign(dictionary.es, copy.es);
  Object.assign(dictionary.en, copy.en);
}

/** Lookup with explicit fallback: locale, then Spanish (the default), then the key itself. */
export function translate(dictionary: CopyDictionary, locale: Locale, key: CopyKey): string {
  return dictionary[locale][key] ?? dictionary.es[key] ?? key;
}

export const copyRegistry: CopyDictionary = buildCopyRegistry(
  import.meta.glob('/src/features/*/copy.ts', { eager: true }),
);
