import { Button, Card } from '@/ui';
import { useNavigate } from '@/app/router';
import { useT } from '@/core/i18n/I18nProvider';
import { illustrationUrl } from '@/assets/illustrations';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';
import { ActionRow } from '@/features/inspect/ActionRow';
import { PlusIcon } from '@/features/inspect/toolIcons';

const ART_WIDTH = 160;
const ART_HEIGHT = 120;

/** Earlier-image empty state (Figma 141:3508). Nothing is fabricated when no prior source exists. */
export default function PriorScreen() {
  const t = useT('compare');
  const tInspect = useT('inspect');
  const navigate = useNavigate();
  return (
    <main className="flex h-dvh flex-col bg-canvas lg:h-auto lg:min-h-dvh lg:mx-auto lg:w-full lg:max-w-3xl">
      <ScreenHeader
        title={t('priorTitle')}
        backTo="/examen/comparar"
        backLabel={t('back')}
        infoLabel={tInspect('info')}
      />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3 lg:overflow-visible lg:px-8 lg:pb-8">
        {/* Same markup as EmptyState below lg; on desktop the illustration sits beside the text. */}
        <div className="flex flex-col items-center gap-3 px-4 py-6 text-center lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-x-8 lg:text-left">
          <div aria-hidden="true" className="flex justify-center lg:row-span-2">
            <img
              src={illustrationUrl('emptyCompare')}
              alt=""
              width={ART_WIDTH}
              height={ART_HEIGHT}
              decoding="async"
              className="h-30 w-auto lg:h-36"
            />
          </div>
          <h2 className="m-0 text-section text-ink lg:col-start-2">{t('priorHeading')}</h2>
          <p className="m-0 max-w-[32ch] text-body text-muted lg:col-start-2 lg:max-w-none">{t('priorBody')}</p>
        </div>
        <Card variant="raised" className="shrink-0">
          <p className="m-0 text-label text-muted">{t('priorCardBody')}</p>
        </Card>
        <ActionRow
          variant="raised"
          tint="blush"
          icon={<PlusIcon />}
          title={t('priorCardAction')}
          hint={t('priorRequirementsHint')}
          to="/examen/abcde?criterio=e"
        />
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/examen/comparar')}>
          {t('dockBack')}
        </Button>
      </ActionDock>
    </main>
  );
}
