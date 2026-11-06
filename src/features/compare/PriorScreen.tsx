import { Button } from '@/ui';
import { useNavigate } from '@/app/router';
import { useT } from '@/core/i18n/I18nProvider';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';

/** Earlier-image empty state (Figma 141:3508). Nothing is fabricated when no prior source exists. */
export default function PriorScreen() {
  const t = useT('compare');
  const tInspect = useT('inspect');
  const navigate = useNavigate();
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader
        title={t('priorTitle')}
        backTo="/examen/comparar"
        backLabel={t('back')}
        infoLabel={tInspect('info')}
      />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('priorHeading')}</h2>
        <p className="m-0 text-body text-ink">{t('priorBody')}</p>
        <div className="flex flex-col gap-1 rounded-tile border border-solid border-white/80 bg-surface p-4">
          <span className="text-body-medium text-ink">{t('priorCardTitle')}</span>
          <span className="text-label text-muted">{t('priorCardBody')}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/examen/abcde?criterio=e')}
          className="grid w-full gap-0.5 rounded-tile border border-solid border-line bg-surface p-4 text-left outline-offset-2"
        >
          <span className="text-body-medium text-ink">{t('priorCardAction')}</span>
          <span className="text-label text-muted">{t('priorRequirementsHint')}</span>
        </button>
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/examen/comparar')}>
          {t('dockBack')}
        </Button>
      </ActionDock>
    </main>
  );
}
