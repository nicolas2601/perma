import { Button, Badge, Chip, PHASE_TINT } from '@/ui';
import { useNavigate } from '@/app/router';
import { useExam } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { CRITERIA, criterionValue } from '@/features/abcde/logic';
import { CRITERION_TITLE_KEY, optionKey } from '@/features/abcde/copy';
import { clinicalContextLines, qualified } from '@/core/exam/clinicalContext';
import { ExperimentalNotice, ScreenHeader, ActionDock } from '@/features/inspect/Chrome';
import { useFlowSync } from '@/features/inspect/flowSync';
import { reviewSource } from './reviewSource';
import { siteCopyKey } from './siteLabel';

const SECTION_CLASS = 'flex flex-col gap-2 rounded-tile border border-solid border-white/80 bg-surface p-4';
/** Formats listed on the desktop export card. The choice itself is made on the export screen. */
const EXPORT_FORMATS = ['optionCsv', 'optionPdf', 'optionJson'] as const;

function siteText(code: string | null, t: (key: string) => string): string {
  const key = siteCopyKey(code);
  return key === null ? t('notRecorded') : t(key);
}

/**
 * Session summary: context, manual observations, note and model output, with the export entry point.
 * Desktop: the record reads in one left column and an export card sits on the right.
 */
export default function SummaryScreen() {
  const t = useT('review');
  const tAbcde = useT('abcde');
  const tInspect = useT('inspect');
  const tFull = useT('');
  const navigate = useNavigate();
  const record = useExam((state) => state.record);
  const result = useExam((state) => state.result);
  const image = useExam((state) => state.image);
  useFlowSync('exporting');
  const openExport = () => navigate('/revision/exportar');
  return (
    <main className="flex h-dvh flex-col bg-canvas lg:h-auto lg:min-h-dvh">
      <ScreenHeader title={t('summaryTitle')} backTo="/examen/comparar" backLabel={t('back')} infoLabel={tInspect('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-x-8 lg:overflow-visible lg:px-8 lg:pb-8">
        {/* The record reads as one column; below lg the wrapper is `contents`, so mobile keeps the flat order. */}
        <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
          <div className="flex">
            <Chip tint={PHASE_TINT.revision}>{tInspect('stepReview')}</Chip>
          </div>
          <h2 className="m-0 text-title text-ink">{t('summaryHeading')}</h2>
          <p className="m-0 text-body text-ink">{t('summaryIntro')}</p>
          <section className={SECTION_CLASS}>
            <h3 className="m-0 text-section text-ink">{t('contextTitle')}</h3>
            <Field label={t('bodySiteLabel')} value={siteText(record.bodySite, t)} />
            <Field label={t('modalityLabel')} value={reviewSource(image, t)} />
          </section>
          <section className={SECTION_CLASS}>
            <h3 className="m-0 text-section text-ink">{tFull(qualified('ctxExportTitle'))}</h3>
            {clinicalContextLines(record.clinicalContext, tFull).map((line) => (
              <p key={line} className="m-0 text-body text-ink">{line}</p>
            ))}
            <p className="m-0 text-label text-muted">{tFull(qualified('ctxExportNotice'))}</p>
            <p className="m-0 text-label text-muted">{tFull(qualified('ctxReviewScores'))}</p>
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
          <section className={SECTION_CLASS}>
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
        <aside className="hidden lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-4 lg:self-start lg:rounded-card lg:bg-surface lg:p-5 lg:shadow-raised">
          <h3 className="m-0 text-section text-ink">{t('exportTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('exportIntro')}</p>
          <ul aria-label={t('exportOptions')} className="m-0 flex list-none flex-col gap-1 p-0">
            {EXPORT_FORMATS.map((key) => (
              <li key={key} className="text-label text-ink">
                {t(key)}
              </li>
            ))}
          </ul>
          <Button fullWidth onClick={openExport}>
            {t('openExport')}
          </Button>
        </aside>
      </div>
      <div className="lg:hidden">
        <ActionDock>
          <Button fullWidth onClick={openExport}>
            {t('openExport')}
          </Button>
        </ActionDock>
      </div>
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
