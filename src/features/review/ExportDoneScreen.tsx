import { useEffect } from 'react';
import { Button } from '@/ui';
import { useNavigate } from '@/app/router';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';
import { copy as inspectCopy } from '@/features/inspect/copy';
import { useExam, useExamDispatch, useT } from './api';
import { copy } from './copy';
import { isAckCurrent } from './ack';
import { exportFileName } from './exportRecord';

/**
 * Acknowledgement page. It only exists for a download that started and whose review
 * confirmation still matches the record (G4/G5/G10); otherwise it routes back to review.
 */
export default function ExportDoneScreen() {
  const t = useT(copy);
  const tInspect = useT(inspectCopy);
  const navigate = useNavigate();
  const { record, ackRegistryVersion } = useExam();
  const dispatch = useExamDispatch();
  const current = isAckCurrent(ackRegistryVersion, record);
  useEffect(() => {
    if (!current) navigate('/revision', { replace: true });
  }, [current, navigate]);
  if (!current) return null;
  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('exportDoneHeader')} backTo="/revision" backLabel={t('back')} infoLabel={tInspect('info')} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('exportDoneTitle')}</h2>
        <p className="m-0 text-body text-ink">{t('exportDoneBody')}</p>
        <dl className="m-0 flex flex-col gap-2 rounded-tile border border-solid border-white/80 bg-surface p-4">
          <div className="flex flex-col gap-0.5">
            <dt className="text-caption text-muted">{t('exportDoneFile')}</dt>
            <dd className="m-0 break-all text-body-medium text-ink">{exportFileName(record)}</dd>
          </div>
        </dl>
      </div>
      <ActionDock>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => navigate('/revision')}>
            {t('exportDoneBack')}
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              dispatch({ type: 'RESET' });
              navigate('/');
            }}
          >
            {t('exportDoneNew')}
          </Button>
        </div>
      </ActionDock>
    </main>
  );
}
