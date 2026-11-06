import { useNavigate } from '@/app/router';
import { AppShell } from '@/features/desk/AppShell';
import { loadSampleImage } from '@/features/desk/imageSource';
import { useLoadImage } from '@/features/desk/useLoadImage';
import { CAPTURE_PATH, CONTEXT_PATH } from '@/features/desk/recoveryPaths';
import { cameraCopy } from '@/features/desk/copy';
import { useExam, useGuard, useT } from '@/features/desk/api';
import referenceWebp from '@/assets/images/reference-tschandl-600.webp';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';

const SAMPLE_WIDTH_PX = 600;
const SAMPLE_HEIGHT_PX = 443;

/** The only sample in the app: the public reference image, shown with its attribution. */
export default function Gallery() {
  const t = useT(cameraCopy);
  const navigate = useNavigate();
  const contextSaved = useExam((s) => s.contextSaved);
  const { busy, run } = useLoadImage();
  useGuard(contextSaved, CONTEXT_PATH);
  return (
    <AppShell title={t('galleryShell')} onBack={() => navigate(CAPTURE_PATH)}>
      <h1 className="m-0 text-title text-ink">{t('galleryTitle')}</h1>
      <p className="m-0 text-body text-ink">{t('galleryBody')}</p>
      <Card className="items-center gap-2 p-3">
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
      <div className="mt-auto pt-4">
        <Button fullWidth disabled={busy} onClick={() => void run(loadSampleImage)}>
          {t('galleryCta')}
        </Button>
      </div>
    </AppShell>
  );
}
