import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '@/core/exam/state';
import { fixedClock, makeResult } from '../exam/fixtures';
import { buildJsonDocument, serializeJson, EXPORT_FORMAT_ID } from '@/core/export/json';
import { buildFilename, exportRecord, type ExportDeps } from '@/core/export/exportRecord';
import { buildPdfBlocks } from '@/core/export/pdfContent';
import { renderPdf } from '@/core/export/pdf';
import { toWinAnsi, wrapText } from '@/core/export/pdfText';
import { copyRegistry, translate } from '@/core/i18n/registry';
import type { ExportSnapshot } from '@/core/export/types';

const exportedAt = new Date('2026-11-05T12:00:00.000Z');
const t = (key: Parameters<typeof translate>[2]) => translate(copyRegistry, 'es', key);

function snapshot(overrides: Partial<ExportSnapshot> = {}): ExportSnapshot {
  const record = createInitialState(fixedClock()).record;
  return {
    record: { ...record, bodySite: 'espalda', abcde: { A: 'asimetrica' } },
    image: { name: 'lesion.jpg', origin: 'file' },
    result: makeResult('mock'),
    ...overrides,
  };
}

function deps(overrides: Partial<ExportDeps> = {}): ExportDeps {
  return {
    t,
    now: () => exportedAt,
    renderPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]) as Uint8Array<ArrayBuffer>),
    download: vi.fn(() => true),
    ...overrides,
  };
}

describe('JSON export', () => {
  it('labels the model source and the experimental notice, and keeps raw scores', () => {
    const doc = buildJsonDocument(snapshot(), exportedAt, t);
    expect(doc.format).toBe(EXPORT_FORMAT_ID);
    expect(doc.modelSource).toBe('mock');
    expect(doc.simulated).toBe(true);
    expect(doc.notice).toBe(copyRegistry.es['core.notice.experimental']);
    expect(doc.result?.scores.nv).toBe(0.1);
  });

  it('writes unanswered ABCDE criteria as the explicit value, never omitted', () => {
    const doc = buildJsonDocument(snapshot(), exportedAt, t);
    expect(doc.record.abcde).toEqual({ A: 'asimetrica', B: 'unanswered', C: 'unanswered', D: 'unanswered', E: 'unanswered' });
  });

  it('marks a record exported without a model output as having no source', () => {
    const doc = buildJsonDocument(snapshot({ result: null }), exportedAt, t);
    expect(doc.modelSource).toBeNull();
    expect(doc.simulated).toBe(false);
    expect(doc.result).toBeNull();
  });

  it('serializes to parseable JSON with the export date in ISO form', () => {
    const parsed = JSON.parse(serializeJson(buildJsonDocument(snapshot(), exportedAt, t)));
    expect(parsed.exportedAt).toBe('2026-11-05T12:00:00.000Z');
  });
});

describe('PDF content', () => {
  it('carries the notice, the simulated label, raw scores and the ABCDE answers', () => {
    const texts = buildPdfBlocks(snapshot(), exportedAt, t).map((block) => block.text).join('\n');
    expect(texts).toContain(copyRegistry.es['core.notice.experimental']);
    expect(texts).toContain('Origen del modelo: Modelo simulado');
    expect(texts).toContain('nv: 0.1');
    expect(texts).toContain('A: asimetrica');
    expect(texts).toContain('B: Sin evaluar');
  });

  it('renders a real A4 PDF through pdf-lib on demand', async () => {
    const bytes = await renderPdf(buildPdfBlocks(snapshot(), exportedAt, t));
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('%PDF');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('survives characters outside WinAnsi instead of failing the whole export', async () => {
    const withSymbols = snapshot({
      record: { ...snapshot().record, note: 'lesión → revisar 😀 ≥ 2 mm' },
    });
    const bytes = await renderPdf(buildPdfBlocks(withSymbols, exportedAt, t));
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('%PDF');
  });
});

describe('text layout helpers', () => {
  it('maps characters outside Latin-1 to a question mark and keeps accents', () => {
    expect(toWinAnsi('lesión ≥ 2')).toBe('lesión ? 2');
  });

  it('wraps greedily by measured width and honors explicit newlines', () => {
    const measure = (text: string) => text.length;
    expect(wrapText('uno dos tres\ncuatro', measure, 7)).toEqual(['uno dos', 'tres', 'cuatro']);
  });

  it('splits a word that is wider than the line', () => {
    expect(wrapText('abcdefghij', (text) => text.length, 4)).toEqual(['abcd', 'efgh', 'ij']);
  });
});

describe('exportRecord', () => {
  it('returns ok only after the Blob exists and the download was triggered', async () => {
    const download = vi.fn<(blob: Blob, filename: string) => boolean>(() => true);
    const result = await exportRecord('json', snapshot(), deps({ download }));
    expect(result).toEqual({
      ok: true,
      filename: 'vera-rec1-2026-11-05.json',
      bytes: expect.any(Number),
    });
    const call = download.mock.calls[0];
    expect(call?.[0]).toBeInstanceOf(Blob);
    expect(call?.[0].type).toBe('application/json');
    expect(call?.[1]).toBe('vera-rec1-2026-11-05.json');
  });

  it('reports download-failed when the download is not triggered, so the UI routes to recoverExport', async () => {
    const result = await exportRecord('pdf', snapshot(), deps({ download: () => false }));
    expect(result).toEqual({ ok: false, reason: 'download-failed' });
  });

  it('reports download-failed when the download throws', async () => {
    const result = await exportRecord(
      'json',
      snapshot(),
      deps({ download: () => { throw new Error('blocked'); } }),
    );
    expect(result).toEqual({ ok: false, reason: 'download-failed' });
  });

  it('reports build-failed without attempting a download when the PDF cannot be built', async () => {
    const download = vi.fn(() => true);
    const result = await exportRecord(
      'pdf',
      snapshot(),
      deps({ renderPdf: vi.fn(async () => { throw new Error('pdf-lib'); }), download }),
    );
    expect(result).toEqual({ ok: false, reason: 'build-failed' });
    expect(download).not.toHaveBeenCalled();
  });

  it('builds a PDF filename with a sanitized record prefix', () => {
    expect(buildFilename('ab-c/123 xyz', exportedAt, 'pdf')).toBe('vera-abc123xy-2026-11-05.pdf');
    expect(buildFilename('---', exportedAt, 'json')).toBe('vera-record-2026-11-05.json');
  });
});
