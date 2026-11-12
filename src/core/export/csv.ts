import { CLASS_CODES } from '@/core/inference/types';
import { normalizeClinicalContext } from '@/core/exam/clinicalContext';
import { UNANSWERED_VALUE, type ExportSnapshot, type Translate } from './types';
import { photometryForExport, segmentationForExport } from './explainabilityExport';

/**
 * Tidy long-format CSV for spreadsheets (Excel, Google Sheets, pandas):
 * one row per fact with the columns Section; Field; Value; Note.
 * Semicolon delimiter plus a UTF-8 BOM so Excel in Spanish locales opens it in columns with accents intact.
 */
export const CSV_DELIMITER = ';';
export const CSV_BOM = '﻿';
const CSV_EOL = '\r\n';
const CRITERIA = ['A', 'B', 'C', 'D', 'E'] as const;
const SCORE_DECIMALS = 4;

type Row = readonly [section: string, field: string, value: string, note: string];

/** Quotes when needed and neutralizes spreadsheet formula injection (= + - @ at the start). */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function buildCsvRows(snapshot: ExportSnapshot, exportedAt: Date, t: Translate): Row[] {
  const { record, image } = snapshot;
  const exam = t('core.csv.sectionExam');
  const rows: Row[] = [
    [exam, t('core.export.recordId'), record.id, ''],
    [exam, t('core.csv.createdAt'), record.createdAt, ''],
    [exam, t('core.export.exportedAt'), exportedAt.toISOString(), ''],
    [exam, t('core.csv.bodySite'), record.bodySite ?? t('core.csv.notRecorded'), ''],
    [exam, t('core.export.image'), image === null ? t('core.export.noImage') : t(`core.csv.origin.${image.origin}`), ''],
    [exam, t('core.csv.notice'), t('core.notice.experimental'), ''],
  ];
  rows.push(
    ...contextRows(snapshot, t),
    ...modelRows(snapshot, t),
    ...photometryRows(snapshot, t),
    ...segmentationRows(snapshot, t),
    ...scoreRows(snapshot, t),
    ...abcdeRows(snapshot, t),
  );
  rows.push([t('core.export.note'), t('core.export.note'), record.note.trim() === '' ? t('core.csv.notRecorded') : record.note, '']);
  return rows;
}

function contextRows(snapshot: ExportSnapshot, t: Translate): Row[] {
  const section = t('core.csv.sectionContext');
  const notice = t('core.csv.contextNotice');
  const context = snapshot.record.clinicalContext === undefined ? undefined : normalizeClinicalContext(snapshot.record.clinicalContext);
  if (!context) return [[section, t('core.csv.notRecorded'), '', notice]];
  const rows: Row[] = [];
  if (context.ageYears !== undefined) rows.push([section, t('core.csv.age'), String(context.ageYears), notice]);
  if (context.duration !== undefined) rows.push([section, t('core.csv.duration'), t(`core.csv.duration.${context.duration}`), notice]);
  if (context.symptoms?.length) rows.push([section, t('core.csv.symptoms'), context.symptoms.map((s) => t(`core.csv.symptom.${s}`)).join(', '), notice]);
  if (context.history) rows.push([section, t('core.csv.history'), context.history, notice]);
  return rows.length > 0 ? rows : [[section, t('core.csv.notRecorded'), '', notice]];
}

function modelRows({ result }: ExportSnapshot, t: Translate): Row[] {
  const section = t('core.csv.sectionModel');
  if (result === null) return [[section, t('core.export.noResult'), '', '']];
  const source = result.source === 'mock' ? t('core.source.mock') : t('core.source.live');
  return [
    [section, t('core.export.modelSource'), source, result.source === 'mock' ? t('core.csv.simulatedNote') : ''],
    [section, t('core.csv.model'), result.model, ''],
    [section, t('core.csv.mode'), result.mode, ''],
    [section, t('core.csv.recipe'), result.identity.recipe ?? '', ''],
    [section, t('core.csv.release'), result.identity.release ?? '', ''],
    [section, t('core.csv.sha'), result.identity.sha256 ?? '', ''],
  ];
}

const ITA_DEGREE_DECIMALS = 1;

function segmentationRows({ result }: ExportSnapshot, t: Translate): Row[] {
  if (result === null) return [];
  const segmentation = segmentationForExport(result);
  if (segmentation === null) return [];
  const section = t('core.csv.sectionSegmentation');
  const note = t('core.csv.segmentationNote');
  if (segmentation.status === 'unavailable') {
    return [[section, t('core.csv.segmentationStatus'), t(`core.csv.segmentationReason.${segmentation.reason ?? 'segmenter_error'}`), note]];
  }
  const identity = segmentation.identity;
  if (identity === undefined || segmentation.areaFraction === undefined) return [];
  return [
    [section, t('core.csv.segmenterModel'), identity.modelId, note],
    [section, t('core.csv.segmenterRelease'), identity.release, note],
    [section, t('core.csv.segmenterSha'), identity.modelSha256, note],
    [section, t('core.csv.lesionArea'), segmentation.areaFraction.toFixed(SCORE_DECIMALS), note],
  ];
}

function photometryRows({ result }: ExportSnapshot, t: Translate): Row[] {
  if (result === null) return [];
  const photometry = photometryForExport(result);
  if (photometry === null) return [];
  const section = t('core.csv.sectionPhotometry');
  const note = t('core.csv.itaNote');
  if (photometry.status === 'unavailable') {
    return [[section, t('core.csv.photometryStatus'), t(`core.csv.photometryReason.${photometry.reason}`), note]];
  }
  const category = photometry.itaCategory === null ? t('core.csv.itaNotDeterminable') : t(`core.csv.itaCategory.${photometry.itaCategory}`);
  return [
    [section, t('core.csv.ita'), photometry.itaDeg === null ? '' : photometry.itaDeg.toFixed(ITA_DEGREE_DECIMALS), note],
    [section, t('core.csv.itaCategory'), category, note],
    [section, t('core.csv.medianL'), photometry.medianL.toFixed(ITA_DEGREE_DECIMALS), ''],
    [section, t('core.csv.medianB'), photometry.medianB.toFixed(ITA_DEGREE_DECIMALS), ''],
  ];
}

function scoreRows({ result }: ExportSnapshot, t: Translate): Row[] {
  if (result === null) return [];
  const section = t('core.export.scores');
  const note = t('core.csv.scoreNote');
  return CLASS_CODES.map((code): Row => [section, `${code} - ${t(`core.class.${code}`)}`, result.scores[code].toFixed(SCORE_DECIMALS), note]);
}

function abcdeRows({ record }: ExportSnapshot, t: Translate): Row[] {
  const section = t('core.export.observations');
  return CRITERIA.map((criterion): Row => {
    const stored = record.abcde[criterion];
    const label = stored === undefined || stored === UNANSWERED_VALUE ? t('core.abcde.unanswered') : t(`abcde.${criterion}.${stored}`);
    return [section, `${criterion} - ${t(`abcde.criterion${criterion}`)}`, label === `abcde.${criterion}.${stored}` ? String(stored) : label, ''];
  });
}

export function serializeCsv(rows: readonly Row[], t: Translate): string {
  const header: Row = [t('core.csv.colSection'), t('core.csv.colField'), t('core.csv.colValue'), t('core.csv.colNote')];
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(CSV_DELIMITER));
  return CSV_BOM + lines.join(CSV_EOL) + CSV_EOL;
}
