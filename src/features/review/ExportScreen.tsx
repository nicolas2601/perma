import { useMemo, useState } from 'react';
import { Button, Chip, PHASE_TINT, StatusLine } from '@/ui';
import { useNavigate } from '@/app/router';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { createExportDeps, exportRecord } from '@/core/export/exportRecord';
import { buildCsvRows } from '@/core/export/csv';
import { buildJsonDocument, serializeJson } from '@/core/export/json';
import type { ExportFormat, ExportSnapshot } from '@/core/export/types';
import { ActionDock, ExperimentalNotice, ScreenHeader } from '@/features/inspect/Chrome';
import { useFlowSync } from '@/features/inspect/flowSync';
import { ExportOptionsSheet } from './ExportOptionsSheet';

const ACTION_KEY: Record<ExportFormat, 'exportActionCsv' | 'exportActionJson' | 'exportActionPdf'> = {
  csv: 'exportActionCsv',
  json: 'exportActionJson',
  pdf: 'exportActionPdf',
};

/** Export gate: preview, explicit review confirmation, real download, then acknowledgement. */
export default function ExportScreen() {
  const t = useT('review');
  const tInspect = useT('inspect');
  // Full-key lookup: export copy includes namespaced desk keys (clinical context section).
  const tCore = useT('');
  const navigate = useNavigate();
  const record = useExam((state) => state.record);
  const result = useExam((state) => state.result);
  const image = useExam((state) => state.image);
  const dispatch = useExamDispatch();
  useFlowSync('exporting');
  const [reviewed, setReviewed] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const snapshot = useMemo<ExportSnapshot>(
    () => ({ record, image: image ? { name: image.name, origin: image.origin } : null, result }),
    [record, image, result],
  );
  const preview = useMemo(
    () => serializeJson(buildJsonDocument(snapshot, new Date(), tCore)),
    [snapshot, tCore],
  );
  const csvRows = useMemo(() => buildCsvRows(snapshot, new Date(), tCore), [snapshot, tCore]);

  // The acknowledgement is recorded only after a real download; any failure goes to recovery (G4).
  const exportNow = async () => {
    setBusy(true);
    const outcome = await exportRecord(format, snapshot, createExportDeps(tCore));
    if (outcome.ok) {
      dispatch({ type: 'ACK_EXPORT', format });
      navigate('/revision/exportada');
      return;
    }
    dispatch({ type: 'FAULT', scenario: 'export-unavailable' });
    navigate('/recuperacion/exportacion');
  };

  return (
    <main className="flex h-dvh flex-col bg-canvas lg:h-auto lg:min-h-dvh">
      <ScreenHeader title={t('exportHeader')} backTo="/revision" backLabel={t('back')} infoLabel={tInspect('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-x-8 lg:overflow-visible lg:px-8 lg:pb-8">
        {/* Mobile keeps the reading order (options, preview, acknowledgement) through `order`; desktop puts the preview left and the controls right. */}
        <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
          <div className="flex">
            <Chip tint={PHASE_TINT.revision}>{tInspect('stepReview')}</Chip>
          </div>
          <h2 className="m-0 text-title text-ink">{t('exportTitle')}</h2>
          <p className="m-0 text-body text-ink">{t('exportIntro')}</p>
          {result ? <ExperimentalNotice /> : null}
          <Button variant="secondary" fullWidth onClick={() => setOptionsOpen(true)}>
            {t('exportOptions')}
          </Button>
          <label className="order-2 flex min-h-13 items-center gap-3 text-body text-ink">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
              className="size-6 shrink-0 accent-accent"
            />
            {t('ackLabel')}
          </label>
          {!reviewed ? (
            <div className="order-2">
              <StatusLine message={t('ackRequired')} tone="info" />
            </div>
          ) : null}
        </div>
        <figure className="order-1 m-0 flex flex-col gap-1.5 lg:sticky lg:top-6 lg:order-none lg:col-start-1 lg:row-start-1 lg:self-start">
          <figcaption className="text-label text-muted">{format === 'csv' ? t('exportPreviewLabelCsv') : t('exportPreviewLabel')}</figcaption>
          {format === 'csv' ? (
            <div
              tabIndex={0}
              role="region"
              aria-label={t('exportPreviewLabelCsv')}
              className="max-h-64 overflow-auto rounded-tile border border-solid border-soft-line bg-surface lg:max-h-[50dvh]"
            >
              <table className="w-full border-collapse text-left text-caption text-ink">
                <thead>
                  <tr>
                    {['colSection', 'colField', 'colValue'].map((key) => (
                      <th key={key} scope="col" className="sticky top-0 bg-subtle px-3 py-2 font-medium">{tCore(`core.csv.${key}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.map((row, index) => (
                    <tr key={index} className="border-0 border-t border-solid border-soft-line align-top">
                      <td className="px-3 py-1.5 text-muted">{row[0]}</td>
                      <td className="px-3 py-1.5">{row[1]}</td>
                      <td className="px-3 py-1.5 break-words">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre
              tabIndex={0}
              aria-label={t('exportPreviewLabel')}
              className="m-0 max-h-64 overflow-auto rounded-tile border border-solid border-soft-line bg-surface p-3 text-caption text-ink lg:max-h-[40dvh]"
            >
              {preview}
            </pre>
          )}
          {format === 'pdf' ? <p className="m-0 text-caption text-muted">{t('exportPdfPreviewNote')}</p> : null}
        </figure>
      </div>
      <ActionDock>
        <Button fullWidth disabled={!reviewed || busy} loading={busy} onClick={exportNow}>
          {t(ACTION_KEY[format])}
        </Button>
      </ActionDock>
      <ExportOptionsSheet open={optionsOpen} format={format} onFormatChange={setFormat} onOpenChange={setOptionsOpen} />
    </main>
  );
}
