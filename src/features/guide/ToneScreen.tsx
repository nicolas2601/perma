import { ScreenHeader } from '@/features/inspect/Chrome';
import { useT } from '@/core/i18n/I18nProvider';

/** Development-only research page (route marked devOnly; excluded from production builds). */
export default function ToneScreen() {
  const t = useT('guide');
  return (
    <main className="flex h-dvh flex-col bg-canvas lg:h-auto lg:min-h-dvh">
      <ScreenHeader title={t('toneLabel')} backTo="/guia" backLabel={t('back')} infoLabel={t('info')} />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('toneTitle')}</h2>
        <p className="m-0 text-body text-muted">{t('toneBody')}</p>
      </div>
    </main>
  );
}
