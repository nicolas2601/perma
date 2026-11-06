import { useState } from 'react';
import { Badge, Button, Card, Chip, Notice, PHASE_TINT } from '@/ui';
import { useExam } from '@/core/exam/react';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import { useNavigate } from '@/app/router';
import { ActionDock, ExperimentalNotice, ScreenHeader } from './Chrome';
import { ActionRow } from './ActionRow';
import { ModelDetailsSheet } from './ModelDetailsSheet';
import { ScoreCard } from './ScoreCard';
import { rankClasses } from './classes';
import { useResultGuard } from './guards';
import { ImageFigure } from './ViewerPanels';
import { isReferenceImage, useObjectUrl } from './useImageSource';
import { InfoGlyphIcon, LayersIcon } from './toolIcons';

const TOP_COUNT = 2;
const RESULT_TINT = PHASE_TINT.resultado;

/**
 * Mobile: one column in reading order. Desktop (lg): a sticky card with the analyzed image and the
 * simulated-model notice on the left, the scores and the section tiles on the right. The wrappers are
 * `contents` below lg, so the mobile DOM order and spacing are unchanged.
 */
export default function ResultScreen() {
  const t = useT('inspect');
  const { locale } = useI18n();
  const navigate = useNavigate();
  const result = useResultGuard();
  const image = useExam((state) => state.image);
  const src = useObjectUrl(image);
  const [modelOpen, setModelOpen] = useState(false);
  if (!result) return null;
  const top = rankClasses(result.scores).slice(0, TOP_COUNT);
  const simulated = result.source === 'mock';
  return (
    <main className="flex h-dvh flex-col bg-canvas lg:h-auto lg:min-h-dvh">
      <ScreenHeader title={t('resultTitle')} backTo="/" backLabel={t('back')} infoLabel={t('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-x-8 lg:gap-y-0 lg:overflow-visible lg:px-8 lg:pb-8">
        <div className="contents lg:sticky lg:top-6 lg:col-start-1 lg:flex lg:flex-col lg:gap-4 lg:self-start lg:rounded-card lg:bg-surface lg:p-4 lg:shadow-raised">
          <div className="hidden lg:block">
            <ImageFigure src={src} reference={isReferenceImage(image)} imageClassName="lg:h-[42dvh]" />
          </div>
          {simulated ? (
            <div className="flex flex-col gap-2">
              <Badge tone="simulated">{t('mockBadge')}</Badge>
              <Notice label={t('mockBadge')}>{t('mockNotice')}</Notice>
            </div>
          ) : null}
        </div>
        <div className="contents lg:col-start-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
          <section className="flex flex-col items-start gap-2.5">
            <Chip tint={RESULT_TINT}>{t('stepResult')}</Chip>
            <h2 className="m-0 text-title text-ink">{t('resultHeading')}</h2>
            <p className="m-0 text-body text-ink">{t('resultIntro')}</p>
          </section>
          <section aria-label={t('topScores')} className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-3">
            {top.map((code) => (
              <ScoreCard key={code} code={code} score={result.scores[code]} locale={locale} to="/resultado/clases" />
            ))}
          </section>
          <Card variant="raised" className="shrink-0">
            <p className="m-0 text-body-medium text-ink">{t('noCalibratedRisk')}</p>
            <p className="m-0 text-header text-muted">{t('noCalibratedRiskBody')}</p>
          </Card>
          <div className="contents lg:grid lg:grid-cols-2 lg:gap-3">
            <ActionRow
              tint={RESULT_TINT}
              icon={<LayersIcon />}
              title={t('viewAllScores')}
              hint={t('viewAllScoresHint')}
              to="/resultado/clases"
            tile
            />
            <ActionRow
              tint={RESULT_TINT}
              icon={<InfoGlyphIcon />}
              title={t('modelProvenance')}
              hint={t('modelProvenanceHint')}
              onClick={() => setModelOpen(true)}
              tile
            />
          </div>
          <ExperimentalNotice />
        </div>
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
