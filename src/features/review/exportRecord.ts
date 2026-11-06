import type { InferenceResult } from '@/core/inference/types';
import type { ExamRecord } from '@/core/storage/types';
import { CRITERIA, criterionValue } from '@/features/abcde/logic';

/** Typed failure for the export path; the caller routes it to the export recovery page. */
export class ExportError extends Error {
  readonly code = 'EXPORT_UNAVAILABLE';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ExportError';
  }
}

export type ExportPayload = {
  format: 'json';
  recordId: string;
  createdAt: string;
  bodySite: string | null;
  manualObservations: Record<string, string>;
  note: string;
  modelOutput: null | {
    source: InferenceResult['source'];
    simulated: boolean;
    label: string;
    model: string;
    mode: string;
    scores: InferenceResult['scores'];
    disclaimer: string;
  };
};

export const EXPORT_DISCLAIMER =
  'Prototipo experimental de investigación. Los puntajes no son probabilidades clínicas. No diagnostica.';
const UNANSWERED = 'unanswered';
const SIMULATED_LABEL = 'Modelo simulado';

/** Architecture G7/G8: unanswered criteria are explicit, simulated output is always labelled. */
export function buildExportPayload(record: ExamRecord, result: InferenceResult | null): ExportPayload {
  const manualObservations = Object.fromEntries(
    CRITERIA.map((criterion) => [criterion, criterionValue(record, criterion) ?? UNANSWERED]),
  );
  return {
    format: 'json',
    recordId: record.id,
    createdAt: record.createdAt,
    bodySite: record.bodySite,
    manualObservations,
    note: record.note,
    modelOutput: result
      ? {
          source: result.source,
          simulated: result.source === 'mock',
          label: result.source === 'mock' ? SIMULATED_LABEL : 'Salida experimental',
          model: result.identity.modelId,
          mode: result.mode,
          scores: { ...result.scores },
          disclaimer: EXPORT_DISCLAIMER,
        }
      : null,
  };
}

export function exportFileName(record: ExamRecord): string {
  const stamp = record.createdAt.replace(/[^0-9]/g, '').slice(0, 14);
  return `perma-registro-${stamp || 'sesion'}.json`;
}

/**
 * Starts a real browser download of the JSON payload. Returns true only when the
 * anchor click was dispatched; the caller must not claim more than that.
 */
export function startJsonDownload(payload: ExportPayload, fileName: string): boolean {
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch (cause) {
    throw new ExportError('No se pudo iniciar la descarga del registro.', { cause });
  }
}
