import { Button, PHASE_TINT } from '@/ui';
import { useNavigate } from '@/app/router';
import { useT } from '@/core/i18n/I18nProvider';
import { illustrationUrl } from '@/assets/illustrations';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';
import { ActionRow } from '@/features/inspect/ActionRow';
import { InfoGlyphIcon, LayersIcon } from '@/features/inspect/toolIcons';
import { FileIcon } from '@/ui/icons';

const ART_WIDTH = 120;
const ART_HEIGHT = 90;

/** Static reference page. It never discards or changes the session. */
export default function GuideScreen() {
  const t = useT('guide');
  const navigate = useNavigate();
  return (
    <main className="flex h-dvh flex-col bg-canvas lg:h-auto lg:min-h-dvh lg:mx-auto lg:w-full lg:max-w-3xl">
      <ScreenHeader title={t('guideTitle')} backTo="/" backLabel={t('back')} infoLabel={t('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-8 lg:pb-8">
        <img
          src={illustrationUrl('consentPrivacy')}
          alt=""
          width={ART_WIDTH}
          height={ART_HEIGHT}
          decoding="async"
          className="h-24 w-auto self-start lg:col-span-2"
        />
        <h2 className="m-0 text-title text-ink lg:col-span-2">{t('guideHeading')}</h2>
        <p className="m-0 text-body text-ink lg:col-span-2">{t('guideIntro')}</p>
        <p className="m-0 text-label text-ink lg:col-span-2">{t('imageAttribution')}</p>
        <section className="flex flex-col gap-1.5 lg:rounded-card lg:bg-surface lg:p-5 lg:shadow-raised">
          <h3 className="m-0 text-section text-ink">{t('evidenceTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('evidenceBody')}</p>
        </section>
        <section className="flex flex-col gap-1.5 lg:rounded-card lg:bg-surface lg:p-5 lg:shadow-raised">
          <h3 className="m-0 text-section text-ink">{t('manualTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('manualBody')}</p>
        </section>
        <div className="flex flex-col gap-5 lg:col-span-2">
          <ActionRow
            tint={PHASE_TINT.resultado}
            icon={<LayersIcon />}
            title={t('modelIdentityLabel')}
            hint={t('modelIdentityHint')}
            to="/resultado"
          />
          <ActionRow
            tint="mint"
            icon={<FileIcon className="size-5" />}
            title={t('privacyLabel')}
            hint={t('privacyHint')}
            to="/guia/privacidad"
          />
          {import.meta.env.DEV ? (
            <ActionRow
              tint="sky"
              icon={<InfoGlyphIcon />}
              title={t('toneLabel')}
              hint={t('toneHint')}
              to="/investigacion/tono"
            />
          ) : null}
        </div>
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/')}>
          {t('back')}
        </Button>
      </ActionDock>
    </main>
  );
}
