import { useEffect } from 'react';
import { Button, Chip, DrawCheck, PHASE_TINT } from '@/ui';
import { useNavigate } from '@/app/router';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { isAckValid } from '@/core/exam/state';
import { buildFilename } from '@/core/export/exportRecord';
import { useT } from '@/core/i18n/I18nProvider';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';
import { ExportDoneArt } from './ExportDoneArt';

/**
 * Acknowledgement page. It only exists for a download that started and whose review
 * confirmation still matches the record (G4/G5/G10); otherwise it routes back to review.
 */
export default function ExportDoneScreen() {
  const t = useT('review');
  const tInspect = useT('inspect');
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const current = useExam((state) => isAckValid(state));
  const lastExport = useExam((state) => state.record.lastExport);
  const recordId = useExam((state) => state.record.id);
  useEffect(() => {
    if (!current) navigate('/revision', { replace: true });
  }, [current, navigate]);
  if (!current || lastExport === null) return null;
  const fileName = buildFilename(recordId, new Date(lastExport.at), lastExport.format);
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('exportDoneHeader')} backTo="/revision" backLabel={t('back')} infoLabel={tInspect('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <div className="flex">
          <Chip tint={PHASE_TINT.revision}>{tInspect('stepReview')}</Chip>
        </div>
        <ExportDoneArt />
        <h2 className="m-0 text-title text-ink">{t('exportDoneTitle')}</h2>
        <p className="m-0 text-body text-ink">{t('exportDoneBody')}</p>
        <dl className="m-0 flex flex-col gap-2 rounded-card bg-surface p-4 shadow-raised">
          <div className="flex flex-col gap-0.5">
            <dt className="text-caption text-muted">{t('exportDoneFile')}</dt>
            <dd className="m-0 flex items-center gap-2 break-all text-body-medium text-ink">
              <DrawCheck size={20} />
              <span>{fileName}</span>
            </dd>
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
              dispatch({ type: 'NEW_RECORD' });
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
