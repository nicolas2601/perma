import { useNavigate } from '@/app/router';
import { useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { AppShell } from '@/features/desk/AppShell';
import { loadSampleImage } from '@/features/desk/imageSource';
import { useLoadImage } from '@/features/desk/useLoadImage';
import { useCaptureStage } from '@/features/desk/useCaptureStage';
import { CONTEXT_PATH } from '@/features/desk/recoveryPaths';
import referenceWebp from '@/assets/images/reference-tschandl-600.webp';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

const SAMPLE_WIDTH_PX = 600;
const SAMPLE_HEIGHT_PX = 443;

/** The only sample in the app: the public reference image, shown with its attribution. */
export default function Gallery() {
  const t = useT('camera');
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const { busy, run } = useLoadImage();
  useCaptureStage();

  const back = () => {
    dispatch({ type: 'BACK' });
    navigate(CONTEXT_PATH);
  };

  return (
    <AppShell title={t('galleryShell')} onBack={back} showNav={false}>
      <div className="flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-12 lg:content-start lg:items-start lg:gap-x-8 lg:gap-y-6">
        <h1 className="m-0 text-title text-ink lg:col-span-12">{t('galleryTitle')}</h1>
        <p className="m-0 text-body text-ink lg:col-span-12 lg:max-w-180">{t('galleryBody')}</p>
        <Card variant="raised" className="items-center gap-2 p-3 lg:col-span-7 lg:p-4">
          <img
            src={referenceWebp}
            width={SAMPLE_WIDTH_PX}
            height={SAMPLE_HEIGHT_PX}
            alt=""
            decoding="async"
            className="h-auto w-full rounded-chip object-contain"
          />
          <p className="m-0 self-start text-caption text-muted">{t('galleryAttribution')}</p>
        </Card>
        <div className="flex flex-1 flex-col gap-5 lg:col-span-5">
          <Card variant="soft" className="gap-1 p-3 lg:p-6">
            <p className="m-0 text-body text-ink">{t('galleryFileName')}</p>
            <p className="m-0 text-caption text-muted">{t('galleryFileMeta')}</p>
          </Card>
          <div className="mt-auto pt-4 lg:mt-0 lg:pt-0">
            <Button fullWidth className="lg:w-auto lg:px-8" disabled={busy} onClick={() => void run(loadSampleImage)}>
              {t('galleryCta')}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
