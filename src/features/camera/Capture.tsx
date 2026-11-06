import { useState, type ReactNode } from 'react';
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
import { Glyph } from '@/features/desk/Glyph';
import { IconBlob } from '@/ui/IconBlob';
import { BookIcon, ChevronDownIcon, FileIcon, ScanIcon } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { StatusLine } from '@/ui/StatusLine';
import { cx } from '@/ui/cx';

const OPTION_CLASS =
  'grid min-h-20 w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-card bg-surface px-4 py-3 text-left text-ink shadow-raised outline-offset-2 transition-transform duration-(--motion-card) ease-perma-out active:scale-[0.98] motion-reduce:active:scale-100';

function OptionBody({ title, hint, icon }: { title: string; hint: string; icon: ReactNode }) {
  return (
    <>
      <IconBlob tint="mint">
        {icon}
      </IconBlob>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-body text-ink">{title}</span>
        <span className="text-caption text-muted">{hint}</span>
      </span>
      <Glyph className="size-5 -rotate-90 text-muted">
        <ChevronDownIcon />
      </Glyph>
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
          <OptionBody title={t('optCamera')} hint={t('optCameraHint')} icon={<ScanIcon />} />
        </button>
        <label className={cx(OPTION_CLASS, 'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent', busy && 'opacity-60')}>
          <OptionBody title={t('optFile')} hint={t('optFileHint')} icon={<FileIcon />} />
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            disabled={busy}
            className="sr-only"
            onChange={(event) => onFileChosen(event.target.files?.[0])}
          />
        </label>
        <button type="button" disabled={busy} onClick={() => navigate(GALLERY_PATH)} className={cx(OPTION_CLASS, busy && 'opacity-60')}>
          <OptionBody title={t('optSample')} hint={t('optSampleHint')} icon={<BookIcon />} />
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
