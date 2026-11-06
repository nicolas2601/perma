import { useMemo, useState } from 'react';
import { Button, StatusLine } from '@/ui';
import { useNavigate } from '@/app/router';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { createExportDeps, exportRecord } from '@/core/export/exportRecord';
import { buildJsonDocument, serializeJson } from '@/core/export/json';
import type { ExportFormat, ExportSnapshot } from '@/core/export/types';
import { ActionDock, ExperimentalNotice, ScreenHeader } from '@/features/inspect/Chrome';
import { useFlowSync } from '@/features/inspect/flowSync';
import { ExportOptionsSheet } from './ExportOptionsSheet';

const ACTION_KEY: Record<ExportFormat, 'exportActionJson' | 'exportActionPdf'> = {
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
  const [format, setFormat] = useState<ExportFormat>('json');
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
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('exportHeader')} backTo="/revision" backLabel={t('back')} infoLabel={tInspect('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('exportTitle')}</h2>
        <p className="m-0 text-body text-ink">{t('exportIntro')}</p>
        {result ? <ExperimentalNotice /> : null}
        <Button variant="secondary" fullWidth onClick={() => setOptionsOpen(true)}>
          {t('exportOptions')}
        </Button>
        <figure className="m-0 flex flex-col gap-1.5">
          <figcaption className="text-label text-muted">{t('exportPreviewLabel')}</figcaption>
          <pre
            tabIndex={0}
            aria-label={t('exportPreviewLabel')}
            className="m-0 max-h-64 overflow-auto rounded-tile border border-solid border-soft-line bg-surface p-3 text-caption text-ink"
          >
            {preview}
          </pre>
          {format === 'pdf' ? <p className="m-0 text-caption text-muted">{t('exportPdfPreviewNote')}</p> : null}
        </figure>
        <label className="flex min-h-13 items-center gap-3 text-body text-ink">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
            className="size-6 shrink-0 accent-accent"
          />
          {t('ackLabel')}
        </label>
        {!reviewed ? <StatusLine message={t('ackRequired')} tone="info" /> : null}
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
