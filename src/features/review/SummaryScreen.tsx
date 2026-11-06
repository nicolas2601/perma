import { Button, Badge } from '@/ui';
import { useNavigate } from '@/app/router';
import { useExam } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { CRITERIA, criterionValue } from '@/features/abcde/logic';
import { CRITERION_TITLE_KEY, optionKey } from '@/features/abcde/copy';
import { ExperimentalNotice, ScreenHeader, ActionDock } from '@/features/inspect/Chrome';
import { useFlowSync } from '@/features/inspect/flowSync';
import { reviewSource } from './reviewSource';
import { siteCopyKey } from './siteLabel';

function siteText(code: string | null, t: (key: string) => string): string {
  const key = siteCopyKey(code);
  return key === null ? t('notRecorded') : t(key);
}

/** Session summary: context, manual observations, note and model output, with the export entry point. */
export default function SummaryScreen() {
  const t = useT('review');
  const tAbcde = useT('abcde');
  const tInspect = useT('inspect');
  const navigate = useNavigate();
  const record = useExam((state) => state.record);
  const result = useExam((state) => state.result);
  const image = useExam((state) => state.image);
  useFlowSync('exporting');
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('summaryTitle')} backTo="/examen/comparar" backLabel={t('back')} infoLabel={tInspect('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('summaryHeading')}</h2>
        <p className="m-0 text-body text-ink">{t('summaryIntro')}</p>
        <section className="flex flex-col gap-2 rounded-tile border border-solid border-white/80 bg-surface p-4">
          <h3 className="m-0 text-section text-ink">{t('contextTitle')}</h3>
          <Field label={t('bodySiteLabel')} value={siteText(record.bodySite, t)} />
          <Field label={t('modalityLabel')} value={reviewSource(image, t)} />
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-section text-ink">{t('observationsTitle')}</h3>
          <ul className="m-0 flex list-none flex-col rounded-tile border border-solid border-soft-line bg-surface px-4">
            {CRITERIA.map((criterion) => {
              const value = criterionValue(record, criterion);
              return (
                <li key={criterion} className="flex flex-col gap-0.5 border-b border-solid border-soft-line py-2 last:border-b-0">
                  <span className="text-caption text-muted">
                    {criterion} · {tAbcde(CRITERION_TITLE_KEY[criterion])}
                  </span>
                  <span className="text-body-medium text-ink">
                    {value === null ? t('unanswered') : tAbcde(optionKey(criterion, value))}
                  </span>
                </li>
              );
            })}
          </ul>
          <Button variant="secondary" fullWidth onClick={() => navigate('/examen/abcde')}>
            {t('editObservations')}
          </Button>
        </section>
        <section className="flex flex-col gap-2 rounded-tile border border-solid border-white/80 bg-surface p-4">
          <h3 className="m-0 text-body-medium text-ink">{t('noteTitle')}</h3>
          <p className="m-0 text-body text-ink">{record.note.length > 0 ? record.note : t('noteNone')}</p>
          <Button variant="secondary" onClick={() => navigate('/examen/comparar')}>
            {t('editNote')}
          </Button>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-body-medium text-ink">{t('modelTitle')}</h3>
          {result ? (
            <>
              {result.source === 'mock' ? <Badge tone="simulated">{tInspect('mockBadge')}</Badge> : null}
              <p className="m-0 text-label text-muted">
                {result.source === 'mock' ? t('modelSimulated') : t('modelExperimental')}
              </p>
              <ExperimentalNotice />
            </>
          ) : (
            <p className="m-0 text-label text-muted">{t('modelNone')}</p>
          )}
        </section>
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/revision/exportar')}>
          {t('openExport')}
        </Button>
      </ActionDock>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-muted">{label}</span>
      <span className="text-body-medium text-ink">{value}</span>
    </div>
  );
}
