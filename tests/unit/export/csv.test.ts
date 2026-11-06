import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '@/core/exam/state';
import { fixedClock, makeResult } from '../exam/fixtures';
import { buildCsvRows, csvCell, serializeCsv, CSV_BOM } from '@/core/export/csv';
import { exportRecord, type ExportDeps } from '@/core/export/exportRecord';
import { copyRegistry, translate } from '@/core/i18n/registry';
import type { ExportSnapshot } from '@/core/export/types';

const exportedAt = new Date('2026-11-06T12:00:00.000Z');
const es = (key: string) => translate(copyRegistry, 'es', key);
const en = (key: string) => translate(copyRegistry, 'en', key);

function snapshot(overrides: Partial<ExportSnapshot> = {}): ExportSnapshot {
  const record = createInitialState(fixedClock()).record;
  return {
    record: { ...record, bodySite: 'espalda', note: 'Nota; con "comillas"', abcde: { A: 'symmetric' } },
    image: { name: 'imagen-adjunta', origin: 'file' },
    result: makeResult('mock'),
    ...overrides,
  };
}

describe('CSV export', () => {
  it('neutralizes spreadsheet formulas and quotes delimiters, quotes and newlines', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('di "hola"')).toBe('"di ""hola"""');
    expect(csvCell('línea\nnueva')).toBe('"línea\nnueva"');
    expect(csvCell('normal')).toBe('normal');
  });

  it('is a tidy table: BOM, semicolon header, one row per fact, 7 raw scores without percentages', () => {
    const rows = buildCsvRows(snapshot(), exportedAt, es);
    const text = serializeCsv(rows, es);
    expect(text.startsWith(CSV_BOM + 'Sección;Campo;Valor;Nota\r\n')).toBe(true);
    const scoreRows = rows.filter((row) => row[0] === 'Puntajes crudos');
    expect(scoreRows).toHaveLength(7);
    for (const row of scoreRows) {
      expect(row[2]).toMatch(/^0\.\d{4}$|^1\.0000$/);
      expect(row[2]).not.toContain('%');
    }
    expect(rows.filter((row) => row[0] === 'Observaciones ABCDE')).toHaveLength(5);
    expect(text).toContain('Sin evaluar');
  });

  it('labels simulated output and keeps the experimental notice', () => {
    const text = serializeCsv(buildCsvRows(snapshot(), exportedAt, es), es);
    expect(text).toContain('Valores simulados');
    expect(text).toContain('No diagnostica');
  });

  it('translates headers and sections to English', () => {
    const text = serializeCsv(buildCsvRows(snapshot(), exportedAt, en), en);
    expect(text).toContain('Section;Field;Value;Note');
    expect(text).toContain('Raw scores');
  });

  it('downloads a text/csv file only after the Blob exists', async () => {
    const download = vi.fn((_blob: Blob, _filename: string) => true);
    const deps: ExportDeps = { t: es, now: () => exportedAt, renderPdf: vi.fn(), download };
    const result = await exportRecord('csv', snapshot(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.filename.endsWith('.csv')).toBe(true);
    const blob = download.mock.calls[0]![0];
    expect(blob.type).toContain('text/csv');
  });
});
