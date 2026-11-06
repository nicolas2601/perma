import { useState } from 'react';
import { Badge, Button, Card, Chip, Notice, PHASE_TINT } from '@/ui';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import { useNavigate } from '@/app/router';
import { ActionDock, ExperimentalNotice, ScreenHeader } from './Chrome';
import { ActionRow } from './ActionRow';
import { ModelDetailsSheet } from './ModelDetailsSheet';
import { ScoreCard } from './ScoreCard';
import { rankClasses } from './classes';
import { useResultGuard } from './guards';
import { InfoGlyphIcon, LayersIcon } from './toolIcons';

const TOP_COUNT = 2;
const RESULT_TINT = PHASE_TINT.resultado;

export default function ResultScreen() {
  const t = useT('inspect');
  const { locale } = useI18n();
  const navigate = useNavigate();
  const result = useResultGuard();
  const [modelOpen, setModelOpen] = useState(false);
  if (!result) return null;
  const top = rankClasses(result.scores).slice(0, TOP_COUNT);
  const simulated = result.source === 'mock';
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('resultTitle')} backTo="/" backLabel={t('back')} infoLabel={t('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        {simulated ? (
          <div className="flex flex-col gap-2">
            <Badge tone="simulated">{t('mockBadge')}</Badge>
            <Notice label={t('mockBadge')}>{t('mockNotice')}</Notice>
          </div>
        ) : null}
        <section className="flex flex-col items-start gap-2.5">
          <Chip tint={RESULT_TINT}>{t('stepResult')}</Chip>
          <h2 className="m-0 text-title text-ink">{t('resultHeading')}</h2>
          <p className="m-0 text-body text-ink">{t('resultIntro')}</p>
        </section>
        <section aria-label={t('topScores')} className="flex flex-col gap-3">
          {top.map((code) => (
            <ScoreCard key={code} code={code} score={result.scores[code]} locale={locale} to="/resultado/clases" />
          ))}
        </section>
        <Card variant="raised" className="shrink-0">
          <p className="m-0 text-body-medium text-ink">{t('noCalibratedRisk')}</p>
          <p className="m-0 text-header text-muted">{t('noCalibratedRiskBody')}</p>
        </Card>
        <ActionRow
          tint={RESULT_TINT}
          icon={<LayersIcon />}
          title={t('viewAllScores')}
          hint={t('viewAllScoresHint')}
          to="/resultado/clases"
        />
        <ActionRow
          tint={RESULT_TINT}
          icon={<InfoGlyphIcon />}
          title={t('modelProvenance')}
          hint={t('modelProvenanceHint')}
          onClick={() => setModelOpen(true)}
        />
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
