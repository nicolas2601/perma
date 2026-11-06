import { Button } from '@/ui';
import { Link, useNavigate } from '@/app/router';
import { useT } from '@/core/i18n/I18nProvider';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';

type GuideItemProps = { to: string; label: string; hint: string };

function GuideItem({ to, label, hint }: GuideItemProps) {
  return (
    <Link
      to={to}
      className="grid gap-1 rounded-tile border border-solid border-line bg-surface p-4 text-left outline-offset-2"
    >
      <span className="text-body-medium text-ink">{label}</span>
      <span className="text-header text-muted">{hint}</span>
    </Link>
  );
}

/** Static reference page. It never discards or changes the session. */
export default function GuideScreen() {
  const t = useT('guide');
  const navigate = useNavigate();
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('guideTitle')} backTo="/" backLabel={t('back')} infoLabel={t('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('guideHeading')}</h2>
        <p className="m-0 text-body text-ink">{t('guideIntro')}</p>
        <p className="m-0 text-label text-ink">{t('imageAttribution')}</p>
        <section className="flex flex-col gap-1.5">
          <h3 className="m-0 text-section text-ink">{t('evidenceTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('evidenceBody')}</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h3 className="m-0 text-section text-ink">{t('manualTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('manualBody')}</p>
        </section>
        <GuideItem to="/resultado" label={t('modelIdentityLabel')} hint={t('modelIdentityHint')} />
        <GuideItem to="/guia/privacidad" label={t('privacyLabel')} hint={t('privacyHint')} />
        {import.meta.env.DEV ? (
          <GuideItem to="/investigacion/tono" label={t('toneLabel')} hint={t('toneHint')} />
        ) : null}
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/')}>
          {t('back')}
        </Button>
      </ActionDock>
    </main>
  );
}
