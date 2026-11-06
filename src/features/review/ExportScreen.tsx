import { useState } from 'react';
import { Button, StatusLine } from '@/ui';
import { useNavigate } from '@/app/router';
import { ActionDock, ExperimentalNotice, ScreenHeader } from '@/features/inspect/Chrome';
import { copy as inspectCopy } from '@/features/inspect/copy';
import { useExam, useExamDispatch, useT } from './api';
import { copy } from './copy';
import { canRecordAck } from './ack';
import { buildExportPayload, exportFileName, ExportError, startJsonDownload } from './exportRecord';
import { ExportOptionsSheet } from './ExportOptionsSheet';

/** Export gate: preview, explicit review confirmation, real download, then acknowledgement. */
export default function ExportScreen() {
  const t = useT(copy);
  const tInspect = useT(inspectCopy);
  const navigate = useNavigate();
  const { record, result } = useExam();
  const dispatch = useExamDispatch();
  const [reviewed, setReviewed] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const payload = buildExportPayload(record, result);

  // Acknowledgement is recorded only after a download actually started; any failure goes to recovery.
  const exportNow = () => {
    try {
      const started = startJsonDownload(payload, exportFileName(record));
      if (!canRecordAck(started)) throw new ExportError('Download did not start');
      dispatch({ type: 'ACK_EXPORT', format: 'json' });
      navigate('/revision/exportada');
    } catch {
      navigate('/recuperacion/exportacion');
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('exportHeader')} backTo="/revision" backLabel={t('back')} infoLabel={tInspect('info')} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
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
            {JSON.stringify(payload, null, 2)}
          </pre>
        </figure>
        <label className="flex min-h-13 items-center gap-3 text-body text-ink">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
            className="size-5 accent-accent"
          />
          {t('ackLabel')}
        </label>
        {!reviewed ? <StatusLine message={t('ackRequired')} tone="info" /> : null}
      </div>
      <ActionDock>
        <Button fullWidth disabled={!reviewed} onClick={exportNow}>
          {t('exportAction')}
        </Button>
      </ActionDock>
      <ExportOptionsSheet open={optionsOpen} onOpenChange={setOptionsOpen} />
    </main>
  );
}
