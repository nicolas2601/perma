import type { ClinicalContext, ExamRecord } from '@/core/storage/types';
import type { InferenceResult } from '@/core/inference/types';
import { normalizeClinicalContext, qualified } from '@/core/exam/clinicalContext';
import { UNANSWERED_VALUE, type ExportSnapshot, type Translate } from './types';

export const EXPORT_FORMAT_ID = 'perma-exam-record';
export const EXPORT_SCHEMA_VERSION = 1;
const CRITERIA = ['A', 'B', 'C', 'D', 'E'] as const;
const JSON_INDENT = 2;

export interface JsonExportDocument {
  format: typeof EXPORT_FORMAT_ID;
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  notice: string;
  record: {
    id: string;
    createdAt: string;
    bodySite: string | null;
    note: string;
    registryVersion: number;
    abcde: Record<(typeof CRITERIA)[number], string>;
  };
  image: { name: string; origin: string } | null;
  /** Source label: live backend or simulated mock. Mock output is never presented as real. */
  modelSource: InferenceResult['source'] | null;
  simulated: boolean;
  result: {
    model: string;
    mode: string;
    identity: InferenceResult['identity'];
    /** Raw experimental scores. Not probabilities. */
    scores: InferenceResult['scores'];
    warnings: string[];
  } | null;
  /** User-typed context. Not interpreted by the model and not used in any score. */
  userSuppliedContext: UserSuppliedContextJson;
}

export interface UserSuppliedContextJson {
  label: string;
  notice: string;
  /** Always false: the model never reads this context. */
  interpretedByModel: false;
  /** Always false: no score uses this context. */
  usedInScores: false;
  context: ClinicalContext | null;
}

export function buildJsonDocument(
  snapshot: ExportSnapshot,
  exportedAt: Date,
  t: Translate,
): JsonExportDocument {
  const { record, result, image } = snapshot;
  return {
    format: EXPORT_FORMAT_ID,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    notice: t('core.notice.experimental'),
    record: {
      id: record.id,
      createdAt: record.createdAt,
      bodySite: record.bodySite,
      note: record.note,
      registryVersion: record.registryVersion,
      abcde: abcdeValues(record),
    },
    image: image === null ? null : { name: image.name, origin: image.origin },
    modelSource: result?.source ?? null,
    simulated: result?.source === 'mock',
    result: result === null ? null : resultPayload(result),
    userSuppliedContext: userSuppliedJson(record, t),
  };
}

function userSuppliedJson(record: ExamRecord, t: Translate): UserSuppliedContextJson {
  const context = record.clinicalContext === undefined ? undefined : normalizeClinicalContext(record.clinicalContext);
  return {
    label: t(qualified('ctxExportTitle')),
    notice: t(qualified('ctxExportNotice')),
    interpretedByModel: false,
    usedInScores: false,
    context: context ?? null,
  };
}

function abcdeValues(record: ExamRecord): JsonExportDocument['record']['abcde'] {
  return Object.fromEntries(
    CRITERIA.map((criterion) => [criterion, record.abcde[criterion] ?? UNANSWERED_VALUE]),
  ) as JsonExportDocument['record']['abcde'];
}

function resultPayload(result: InferenceResult): NonNullable<JsonExportDocument['result']> {
  return {
    model: result.model,
    mode: result.mode,
    identity: result.identity,
    scores: result.scores,
    warnings: result.warnings,
  };
}

export function serializeJson(document: JsonExportDocument): string {
  return JSON.stringify(document, null, JSON_INDENT);
}
