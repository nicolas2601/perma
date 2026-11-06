import { Button } from '@/ui';
import { useNavigate } from '@/app/router';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';
import { useT } from '@/core/i18n/I18nProvider';

const SECTIONS = [
  { title: 'stayTitle', body: 'stayBody' },
  { title: 'travelTitle', body: 'travelBody' },
  { title: 'retentionTitle', body: 'retentionBody' },
  { title: 'referenceTitle', body: 'referenceBody' },
  { title: 'licencesTitle', body: 'licencesBody' },
  { title: 'noGuaranteeTitle', body: 'noGuaranteeBody' },
] as const;

/** Real data-handling text: what stays on the device and what travels to the API. */
export default function PrivacyScreen() {
  const t = useT('guide');
  const navigate = useNavigate();
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('privacyTitle')} backTo="/guia" backLabel={t('back')} infoLabel={t('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('privacyHeading')}</h2>
        <p className="m-0 text-body text-ink">{t('privacyIntro')}</p>
        {SECTIONS.map((section) => (
          <section key={section.title} className="flex flex-col gap-1.5">
            <h3 className="m-0 text-section text-ink">{t(section.title)}</h3>
            <p className="m-0 text-body text-muted">{t(section.body)}</p>
          </section>
        ))}
      </div>
      <ActionDock>
        <Button fullWidth variant="secondary" onClick={() => navigate('/guia')}>
          {t('privacyAction')}
        </Button>
      </ActionDock>
    </main>
  );
}
