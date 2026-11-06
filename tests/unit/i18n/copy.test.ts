import { describe, expect, it } from 'vitest';
import { coreCopy } from '@/core/i18n/coreCopy';
import {
  buildCopyRegistry,
  CopyContractError,
  copyRegistry,
  translate,
} from '@/core/i18n/registry';

function feature(es: Record<string, string>, en: Record<string, string>) {
  return { copy: { es, en } };
}

describe('copy registry', () => {
  it('merges core copy with feature copy modules', () => {
    const merged = buildCopyRegistry({
      '/src/features/camera/copy.ts': feature({ 'camera.title': 'Cámara' }, { 'camera.title': 'Camera' }),
    });
    expect(merged.es['camera.title']).toBe('Cámara');
    expect(merged.en['camera.title']).toBe('Camera');
    expect(merged.es['core.notice.experimental']).toBe(coreCopy.es['core.notice.experimental']);
  });

  it('fails fast when a feature has an ES key without an EN twin', () => {
    expect(() =>
      buildCopyRegistry({
        '/src/features/camera/copy.ts': feature({ 'camera.title': 'Cámara', 'camera.only': 'x' }, { 'camera.title': 'Camera' }),
      }),
    ).toThrow(CopyContractError);
    expect(() =>
      buildCopyRegistry({
        '/src/features/camera/copy.ts': feature({ 'camera.title': 'Cámara' }, { 'camera.title': 'Camera', 'camera.extra': 'e' }),
      }),
    ).toThrow(/only en: \[camera\.extra\]/);
  });

  it('rejects a module that does not export the copy contract', () => {
    expect(() => buildCopyRegistry({ '/src/features/bad/copy.ts': { copy: { es: 'nope' } } })).toThrow(
      /expected export `copy`/,
    );
  });

  it('rejects a key declared by two features', () => {
    expect(() =>
      buildCopyRegistry({
        '/src/features/a/copy.ts': feature({ 'shared.key': 'a' }, { 'shared.key': 'a' }),
        '/src/features/b/copy.ts': feature({ 'shared.key': 'b' }, { 'shared.key': 'b' }),
      }),
    ).toThrow(/duplicate key "shared.key"/);
  });

  it('keeps ES and EN key sets identical in core copy', () => {
    expect(Object.keys(coreCopy.es).sort()).toEqual(Object.keys(coreCopy.en).sort());
  });

  it('keeps ES and EN key sets identical for every real feature copy file', () => {
    const modules = import.meta.glob('/src/features/*/copy.ts', { eager: true });
    for (const [path, module] of Object.entries(modules)) {
      const { copy } = module as { copy: { es: object; en: object } };
      expect(Object.keys(copy.en).sort(), path).toEqual(Object.keys(copy.es).sort());
    }
    expect(() => buildCopyRegistry(modules)).not.toThrow();
  });

  it('exposes the shared registry built from the real glob', () => {
    expect(copyRegistry.es['core.badge.simulated']).toBe('Modelo simulado');
    expect(copyRegistry.en['core.badge.simulated']).toBe('Simulated model');
  });
});

describe('translate', () => {
  const dictionary = {
    es: { 'core.badge.simulated': 'Modelo simulado', 'core.abcde.unanswered': 'Sin evaluar' },
    en: { 'core.badge.simulated': 'Simulated model' },
  };

  it('uses the active locale when the key exists there', () => {
    expect(translate(dictionary, 'en', 'core.badge.simulated')).toBe('Simulated model');
  });

  it('falls back to Spanish when the active locale lacks the key', () => {
    expect(translate(dictionary, 'en', 'core.abcde.unanswered')).toBe('Sin evaluar');
  });

  it('falls back to the key itself when no table has it', () => {
    expect(translate(dictionary, 'en', 'core.source.live')).toBe('core.source.live');
  });
});
