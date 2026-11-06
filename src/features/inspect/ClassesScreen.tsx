import { Button } from '@/ui';
import { useNavigate } from '@/app/router';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import { ActionDock, ExperimentalNotice, ScreenHeader } from './Chrome';
import { rankClasses } from './classes';
import { ScoreCard } from './ScoreCard';
import { useResultGuard } from './guards';

export default function ClassesScreen() {
  const t = useT('inspect');
  const { locale } = useI18n();
  const navigate = useNavigate();
  const result = useResultGuard();
  if (!result) return null;
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('viewAllScores')} backTo="/resultado" backLabel={t('back')} infoLabel={t('info')} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('classesTitle')}</h2>
        <p className="m-0 text-body text-ink">{t('classesIntro')}</p>
        <ul aria-label={t('viewAllScores')} className="m-0 flex list-none flex-col gap-3 p-0">
          {rankClasses(result.scores).map((code) => (
            <li key={code}>
              <ScoreCard code={code} score={result.scores[code]} locale={locale} to={`/resultado/clases/${code}`} />
            </li>
          ))}
        </ul>
        <ExperimentalNotice />
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/inspeccion')}>
          {t('classesBack')}
        </Button>
      </ActionDock>
    </main>
  );
}
