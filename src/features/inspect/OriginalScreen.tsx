import { Button } from '@/ui';
import { useNavigate } from '@/app/router';
import { useExam } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { ActionDock, ScreenHeader } from './Chrome';
import { useObjectUrl, isReferenceImage, PUBLIC_REFERENCE_URL } from './useImageSource';

/** Unmodified original, fit to the screen. No filters, overlays or cropping. */
export default function OriginalScreen() {
  const t = useT('inspect');
  const tCommon = t;
  const navigate = useNavigate();
  const image = useExam((state) => state.image);
  const src = useObjectUrl(image);
  const reference = isReferenceImage(image);
  const shown = src ?? (reference ? PUBLIC_REFERENCE_URL : null);
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('originalTitle')} backTo="/inspeccion" backLabel={tCommon('back')} infoLabel={tCommon('info')} />
      <div className="flex flex-1 flex-col gap-2 px-5 pb-5 pt-3">
        {shown ? (
          <img
            src={shown}
            alt={reference ? t('imageAltReference') : t('imageAltSession')}
            decoding="async"
            className="block h-full min-h-80 w-full object-contain"
          />
        ) : (
          <p className="m-0 text-label text-muted">{t('unavailableImage')}</p>
        )}
        {reference && shown ? <p className="m-0 text-caption text-muted">{t('referenceAttribution')}</p> : null}
      </div>
      <ActionDock>
        <Button fullWidth variant="secondary" onClick={() => navigate('/inspeccion')}>
          {t('originalBack')}
        </Button>
      </ActionDock>
    </main>
  );
}
