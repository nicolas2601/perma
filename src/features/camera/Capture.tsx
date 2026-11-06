import { useState } from 'react';
import { useNavigate } from '@/app/router';
import { useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { AppShell } from '@/features/desk/AppShell';
import { ACCEPTED_IMAGE_TYPES, prepareExamImage } from '@/features/desk/imageFile';
import { loadSampleImage } from '@/features/desk/imageSource';
import { useLoadImage } from '@/features/desk/useLoadImage';
import { useCaptureStage } from '@/features/desk/useCaptureStage';
import { CAMERA_PATH, CONTEXT_PATH, GALLERY_PATH } from '@/features/desk/recoveryPaths';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { StatusLine } from '@/ui/StatusLine';
import { cx } from '@/ui/cx';

const OPTION_CLASS =
  'flex min-h-20 w-full cursor-pointer flex-col items-start gap-1 rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-ink outline-offset-2';

function OptionBody({ title, hint }: { title: string; hint: string }) {
  return (
    <>
      <span className="text-body text-ink">{title}</span>
      <span className="text-caption text-muted">{hint}</span>
    </>
  );
}

export default function Capture() {
  const t = useT('camera');
  const dispatch = useExamDispatch();
  const [primerOpen, setPrimerOpen] = useState(false);
  const navigate = useNavigate();
  const { busy, run: loadAndReview } = useLoadImage();
  useCaptureStage();

  const onFileChosen = (file: File | undefined) => {
    if (!file) return;
    void loadAndReview(() => prepareExamImage(file, { name: 'imagen-adjunta', origin: 'file' }));
  };

  const back = () => {
    dispatch({ type: 'BACK' });
    navigate(CONTEXT_PATH);
  };

  return (
    <AppShell title={t('captureShell')} onBack={back} showNav={false}>
      <h1 className="m-0 text-title text-ink">{t('captureTitle')}</h1>
      <p className="m-0 text-body text-ink">{t('captureBody')}</p>
      {busy ? <StatusLine message={t('measuring')} tone="info" /> : null}
      <div className="flex flex-col gap-3">
        <button type="button" disabled={busy} onClick={() => setPrimerOpen(true)} className={cx(OPTION_CLASS, busy && 'opacity-60')}>
          <OptionBody title={t('optCamera')} hint={t('optCameraHint')} />
        </button>
        <label className={cx(OPTION_CLASS, 'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent', busy && 'opacity-60')}>
          <OptionBody title={t('optFile')} hint={t('optFileHint')} />
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            disabled={busy}
            className="sr-only"
            onChange={(event) => onFileChosen(event.target.files?.[0])}
          />
        </label>
        <button type="button" disabled={busy} onClick={() => navigate(GALLERY_PATH)} className={cx(OPTION_CLASS, busy && 'opacity-60')}>
          <OptionBody title={t('optSample')} hint={t('optSampleHint')} />
        </button>
      </div>
      <div className="mt-auto pt-4">
        <Button fullWidth disabled={busy} onClick={() => void loadAndReview(loadSampleImage)}>
          {t('ctaSample')}
        </Button>
      </div>
      <Sheet open={primerOpen} onOpenChange={setPrimerOpen} title={t('primerTitle')} closeLabel={t('close')}>
        <div className="flex flex-col gap-4">
          <p className="m-0 text-body text-ink">{t('primerBody')}</p>
          <Button fullWidth onClick={() => navigate(CAMERA_PATH)}>
            {t('primerContinue')}
          </Button>
          <Button variant="secondary" fullWidth onClick={() => setPrimerOpen(false)}>
            {t('primerCancel')}
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
