import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/core/exam/state';
import { examReducer } from '@/core/exam/reducer';
import { buildJsonDocument, serializeJson } from '@/core/export/json';
import { buildPdfBlocks } from '@/core/export/pdfContent';
import { copyRegistry, translate } from '@/core/i18n/registry';
import type { ExportSnapshot } from '@/core/export/types';
import type { ClinicalContext } from '@/core/storage/types';
import { fixedClock, makeResult } from '../exam/fixtures';

const exportedAt = new Date('2026-11-05T12:00:00.000Z');
const t = (key: string) => translate(copyRegistry, 'es', key);
const clock = fixedClock();

const context: ClinicalContext = { ageYears: 54, duration: '1to6m', symptoms: ['pain'], history: 'nevo' };

function snapshot(clinicalContext: ClinicalContext | undefined): ExportSnapshot {
  const state = examReducer(
    createInitialState(clock),
    { type: 'SET_CLINICAL_CONTEXT', context: clinicalContext ?? null },
    clock,
  );
  return { record: state.record, image: null, result: makeResult('live') };
}

describe('JSON export: user-supplied context', () => {
  it('carries the context under a clearly labelled section', () => {
    const doc = buildJsonDocument(snapshot(context), exportedAt, t);
    expect(doc.userSuppliedContext.label).toBe('Contexto aportado por el profesional');
    expect(doc.userSuppliedContext.context).toEqual(context);
  });

  it('states that the model never reads it and no score uses it', () => {
    const doc = buildJsonDocument(snapshot(context), exportedAt, t);
    expect(doc.userSuppliedContext.interpretedByModel).toBe(false);
    expect(doc.userSuppliedContext.usedInScores).toBe(false);
    expect(doc.userSuppliedContext.notice).toContain('no influye en los puntajes');
  });

  it('exports null when nothing was supplied', () => {
    const doc = buildJsonDocument(snapshot(undefined), exportedAt, t);
    expect(doc.userSuppliedContext.context).toBeNull();
  });

  it('leaves the model scores identical with and without the context', () => {
    const withContext = buildJsonDocument(snapshot(context), exportedAt, t);
    const without = buildJsonDocument(snapshot(undefined), exportedAt, t);
    expect(withContext.result?.scores).toEqual(without.result?.scores);
    expect(serializeJson(withContext)).toContain('"userSuppliedContext"');
  });
});

describe('PDF export: user-supplied context', () => {
  it('prints the labelled section and its lines after the observations', () => {
    const texts = buildPdfBlocks(snapshot(context), exportedAt, t).map((block) => block.text);
    const heading = texts.indexOf('Contexto aportado por el profesional');
    expect(heading).toBeGreaterThan(texts.indexOf('Observaciones ABCDE'));
    expect(texts).toContain('Edad: 54');
    expect(texts).toContain('Tiempo de evolución: 1-6 meses');
    expect(texts).toContain('Síntomas referidos: Dolor');
  });

  it('prints "No registrado" when nothing was supplied', () => {
    const texts = buildPdfBlocks(snapshot(undefined), exportedAt, t).map((block) => block.text);
    expect(texts).toContain('No registrado');
  });
});
