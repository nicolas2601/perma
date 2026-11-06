import { Button } from '@/ui';
import { useNavigate } from '@/app/router';
import { useExam } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { ActionDock, ScreenHeader } from './Chrome';
import { useObjectUrl, isReferenceImage, PUBLIC_REFERENCE_URL } from './useImageSource';

/** Unmodified original, fit to the screen. No filters, overlays or cropping. */
export default function OriginalScreen() {
  const t = useT('inspect');
  const navigate = useNavigate();
  const image = useExam((state) => state.image);
  const src = useObjectUrl(image);
  const reference = isReferenceImage(image);
  const shown = src ?? (reference ? PUBLIC_REFERENCE_URL : null);
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('originalHeader')} backTo="/inspeccion" backLabel={t('back')} infoLabel={t('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('originalHeading')}</h2>
        <p className="m-0 text-body text-ink">{reference ? t('originalIntroReference') : t('originalIntroSession')}</p>
        <figure className="m-0 flex flex-col overflow-hidden rounded-tile bg-surface">
          {shown ? (
            <img
              src={shown}
              alt={reference ? t('imageAltReference') : t('imageAltSession')}
              decoding="async"
              className="block h-80 w-full object-contain"
            />
          ) : (
            <p className="m-0 p-4 text-label text-muted">{t('unavailableImage')}</p>
          )}
          {shown ? (
            <figcaption className="flex flex-col gap-0.5 border-t border-solid border-soft-line px-3.5 py-2 text-caption text-ink">
              <span>{reference ? t('originalNoteReference') : t('originalNoteSession')}</span>
              {reference ? <span className="text-muted">{t('referenceAttribution')}</span> : null}
            </figcaption>
          ) : null}
        </figure>
      </div>
      <ActionDock>
        <Button fullWidth variant="secondary" onClick={() => navigate('/inspeccion')}>
          {t('originalBack')}
        </Button>
      </ActionDock>
    </main>
  );
}
