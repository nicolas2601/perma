import { renderPdf } from './pdf';
import { buildPdfBlocks, type PdfBlock } from './pdfContent';
import { buildJsonDocument, serializeJson } from './json';
import { triggerDownload } from './download';
import type { ExportFormat, ExportResult, ExportSnapshot, Translate } from './types';

const DATE_PREFIX_LENGTH = 10;
const ID_PREFIX_LENGTH = 8;
const FILE_EXTENSION: Record<ExportFormat, string> = { json: 'json', pdf: 'pdf' };
const MIME_TYPE: Record<ExportFormat, string> = { json: 'application/json', pdf: 'application/pdf' };

/** Injected so tests run without pdf-lib or a real download. */
export interface ExportDeps {
  t: Translate;
  now: () => Date;
  renderPdf: (blocks: PdfBlock[]) => Promise<Uint8Array<ArrayBuffer>>;
  download: (blob: Blob, filename: string) => boolean;
}

export function createExportDeps(t: Translate): ExportDeps {
  return { t, now: () => new Date(), renderPdf, download: triggerDownload };
}

/**
 * Builds the file and triggers the download. ok:true only when the Blob exists
 * and the download was triggered. Otherwise the UI routes to recoverExport.
 * Only the ACK_EXPORT command (after ok:true) moves the exam to "exported".
 */
export async function exportRecord(
  format: ExportFormat,
  snapshot: ExportSnapshot,
  deps: ExportDeps,
): Promise<ExportResult> {
  const exportedAt = deps.now();
  const blob = await buildBlob(format, snapshot, exportedAt, deps);
  if (blob === null) return { ok: false, reason: 'build-failed' };

  const filename = buildFilename(snapshot.record.id, exportedAt, format);
  if (!tryDownload(deps, blob, filename)) return { ok: false, reason: 'download-failed' };
  return { ok: true, filename, bytes: blob.size };
}

async function buildBlob(
  format: ExportFormat,
  snapshot: ExportSnapshot,
  exportedAt: Date,
  deps: ExportDeps,
): Promise<Blob | null> {
  try {
    const bytes = await encode(format, snapshot, exportedAt, deps);
    return new Blob([bytes], { type: MIME_TYPE[format] });
  } catch {
    return null;
  }
}

function encode(
  format: ExportFormat,
  snapshot: ExportSnapshot,
  exportedAt: Date,
  deps: ExportDeps,
): Promise<BlobPart> {
  if (format === 'pdf') {
    return deps.renderPdf(buildPdfBlocks(snapshot, exportedAt, deps.t));
  }
  const json = serializeJson(buildJsonDocument(snapshot, exportedAt, deps.t));
  return Promise.resolve(json);
}

function tryDownload(deps: ExportDeps, blob: Blob, filename: string): boolean {
  try {
    return deps.download(blob, filename);
  } catch {
    return false;
  }
}

export function buildFilename(recordId: string, exportedAt: Date, format: ExportFormat): string {
  const date = exportedAt.toISOString().slice(0, DATE_PREFIX_LENGTH);
  const id = recordId.replace(/[^a-zA-Z0-9]/g, '').slice(0, ID_PREFIX_LENGTH) || 'record';
  return `perma-${id}-${date}.${FILE_EXTENSION[format]}`;
}
