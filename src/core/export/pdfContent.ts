import { CLASS_CODES, type InferenceResult } from '@/core/inference/types';
import type { ExamRecord } from '@/core/storage/types';
import { clinicalContextLines, qualified } from '@/core/exam/clinicalContext';
import type { ExportSnapshot, Translate } from './types';

export type PdfBlock =
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'notice'; text: string }
  | { kind: 'line'; text: string };

const CRITERIA = ['A', 'B', 'C', 'D', 'E'] as const;
const EMPTY_MARK = '-';

/**
 * Printable summary as ordered blocks. Pure, so the layout engine stays a dumb
 * renderer. The model source label and raw scores come from the same snapshot as the JSON.
 */
export function buildPdfBlocks(snapshot: ExportSnapshot, exportedAt: Date, t: Translate): PdfBlock[] {
  const { record, image, result } = snapshot;
  const blocks: PdfBlock[] = [
    { kind: 'title', text: t('core.export.title') },
    { kind: 'notice', text: t('core.notice.experimental') },
    { kind: 'line', text: `${t('core.export.recordId')}: ${record.id}` },
    { kind: 'line', text: `${t('core.export.exportedAt')}: ${exportedAt.toISOString()}` },
    { kind: 'line', text: `${t('core.export.modelSource')}: ${sourceText(result, t)}` },
    { kind: 'line', text: imageText(image, t) },
  ];
  if (result !== null) blocks.push(...resultBlocks(result, t));
  blocks.push(...abcdeBlocks(snapshot, t), ...noteBlocks(record.note, t), ...userContextBlocks(record.clinicalContext, t));
  return blocks;
}

/** Labelled apart from the model output: the model never reads this context. */
function userContextBlocks(context: ExamRecord['clinicalContext'], t: Translate): PdfBlock[] {
  const lines = clinicalContextLines(context, t).map((text): PdfBlock => ({ kind: 'line', text }));
  return [
    { kind: 'heading', text: t(qualified('ctxExportTitle')) },
    { kind: 'notice', text: t(qualified('ctxExportNotice')) },
    ...lines,
  ];
}

function sourceText(result: InferenceResult | null, t: Translate): string {
  if (result === null) return t('core.export.noResult');
  return result.source === 'mock' ? t('core.source.mock') : t('core.source.live');
}

function imageText(image: ExportSnapshot['image'], t: Translate): string {
  const value = image === null ? t('core.export.noImage') : image.name;
  return `${t('core.export.image')}: ${value}`;
}

function resultBlocks(result: InferenceResult, t: Translate): PdfBlock[] {
  const scores = CLASS_CODES.map((code): PdfBlock => ({
    kind: 'line',
    text: `${code}: ${String(result.scores[code])}`,
  }));
  return [{ kind: 'heading', text: t('core.export.scores') }, ...scores];
}

function abcdeBlocks(snapshot: ExportSnapshot, t: Translate): PdfBlock[] {
  const { abcde } = snapshot.record;
  const lines = CRITERIA.map((criterion): PdfBlock => ({
    kind: 'line',
    text: `${criterion}: ${abcde[criterion] ?? t('core.abcde.unanswered')}`,
  }));
  return [{ kind: 'heading', text: t('core.export.observations') }, ...lines];
}

function noteBlocks(note: string, t: Translate): PdfBlock[] {
  const text = note.trim() === '' ? EMPTY_MARK : note;
  return [
    { kind: 'heading', text: t('core.export.note') },
    { kind: 'line', text },
  ];
}
