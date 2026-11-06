import { useState } from 'react';
import { Badge, Button, Notice } from '@/ui';
import { Link, useNavigate } from '@/app/router';
import { useLocale, useT } from './api';
import { ActionDock, ExperimentalNotice, ScreenHeader } from './Chrome';
import { copy } from './copy';
import { ModelDetailsSheet } from './ModelDetailsSheet';
import { ScoreCard } from './ScoreCard';
import { rankClasses } from './classes';
import { useResultGuard } from './guards';

const TOP_COUNT = 2;

export default function ResultScreen() {
  const t = useT(copy);
  const locale = useLocale();
  const navigate = useNavigate();
  const result = useResultGuard();
  const [modelOpen, setModelOpen] = useState(false);
  if (!result) return null;
  const top = rankClasses(result.scores).slice(0, TOP_COUNT);
  const simulated = result.source === 'mock';
  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('resultTitle')} backTo="/" backLabel={t('back')} infoLabel={t('info')} />
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        {simulated ? (
          <div className="flex flex-col gap-2">
            <Badge tone="simulated">{t('mockBadge')}</Badge>
            <Notice label={t('mockBadge')}>{t('mockNotice')}</Notice>
          </div>
        ) : null}
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-title text-ink">{t('resultHeading')}</h2>
          <p className="m-0 text-body text-ink">{t('resultIntro')}</p>
        </section>
        <section aria-label={t('topScores')} className="flex flex-col gap-3">
          {top.map((code) => (
            <ScoreCard
              key={code}
              code={code}
              score={result.scores[code]}
              locale={locale}
              to="/resultado/clases"
            />
          ))}
        </section>
        <section className="rounded-tile border border-solid border-white/80 bg-surface p-4">
          <p className="m-0 text-body-medium text-ink">{t('noCalibratedRisk')}</p>
          <p className="m-0 text-header text-muted">{t('noCalibratedRiskBody')}</p>
        </section>
        <Link
          to="/resultado/clases"
          className="flex min-h-15 flex-col gap-1 rounded-tile border border-solid border-line bg-surface p-4 text-left outline-offset-2"
        >
          <span className="text-body-medium text-ink">{t('viewAllScores')}</span>
          <span className="text-header text-muted">{t('viewAllScoresHint')}</span>
        </Link>
        <button
          type="button"
          onClick={() => setModelOpen(true)}
          className="flex min-h-15 flex-col gap-1 rounded-tile border border-solid border-line bg-surface p-4 text-left outline-offset-2"
        >
          <span className="text-body-medium text-ink">{t('modelProvenance')}</span>
          <span className="text-header text-muted">{t('modelProvenanceHint')}</span>
        </button>
        <ExperimentalNotice />
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/inspeccion')}>
          {t('inspectImage')}
        </Button>
      </ActionDock>
      <ModelDetailsSheet open={modelOpen} onOpenChange={setModelOpen} result={result} />
    </main>
  );
}
