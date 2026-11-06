import { describe, expect, it } from 'vitest';
import {
  clinicalContextLines,
  clinicalContextSummary,
  normalizeClinicalContext,
} from '@/core/exam/clinicalContext';
import { copyRegistry, translate, type CopyDictionary } from '@/core/i18n/registry';
import type { Locale } from '@/core/i18n/contract';

const tFor = (locale: Locale) => (key: string) => translate(copyRegistry as CopyDictionary, locale, key);

describe('normalizeClinicalContext', () => {
  it('trims history, drops empty fields and orders symptoms canonically', () => {
    expect(
      normalizeClinicalContext({ symptoms: ['bleeding', 'itch'], history: '   ', ageYears: 0 }),
    ).toEqual({ ageYears: 0, symptoms: ['itch', 'bleeding'] });
  });

  it('returns undefined when nothing is left', () => {
    expect(normalizeClinicalContext({ symptoms: [], history: ' ' })).toBeUndefined();
  });
});

describe('clinicalContextSummary', () => {
  const context = { ageYears: 54, duration: '1to6m' as const, symptoms: ['itch', 'pain'] as const };

  it('reads as one line in Spanish', () => {
    expect(clinicalContextSummary({ ...context, symptoms: [...context.symptoms] }, tFor('es'))).toBe(
      'Edad 54 · 1-6 meses · 2 síntomas',
    );
  });

  it('reads as one line in English', () => {
    expect(clinicalContextSummary({ ...context, symptoms: [...context.symptoms] }, tFor('en'))).toBe(
      'Age 54 · 1-6 months · 2 symptoms',
    );
  });

  it('says "No registrado" when nothing was saved', () => {
    expect(clinicalContextSummary(undefined, tFor('es'))).toBe('No registrado');
  });
});

describe('clinicalContextLines', () => {
  it('lists each saved field with its label', () => {
    const lines = clinicalContextLines(
      { ageYears: 54, duration: 'lt1w', symptoms: ['itch', 'pain'], history: 'nevo' },
      tFor('es'),
    );
    expect(lines).toEqual([
      'Edad: 54',
      'Evolución: < 1 semana',
      'Síntomas suministrados: Picazón, Dolor',
      'Antecedentes: nevo',
    ]);
  });
});
