import { useEffect, useState } from 'react';
import { useNavigate } from '@/app/router';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { AppShell } from '@/features/desk/AppShell';
import { isLowResolution, measureImage } from '@/features/desk/imageSource';
import { useGuard } from '@/features/desk/useGuard';
import { CAPTURE_PATH, CONSENT_PATH, RECOVERY_PATHS } from '@/features/desk/recoveryPaths';
import { useObjectUrl } from '@/features/desk/useObjectUrl';
import { Glyph } from '@/features/desk/Glyph';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { IconBlob } from '@/ui/IconBlob';
import { ChevronDownIcon, InfoIcon } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { StatusLine } from '@/ui/StatusLine';

interface Size {
  width: number;
  height: number;
}

interface SizeEntry {
  blob: Blob;
  size: Size;
}

/** Measured size for the given blob only; null while measuring. Measure failure opens file-unavailable. */
function useImageSize(blob: Blob | null): Size | null {
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const [entry, setEntry] = useState<SizeEntry | null>(null);
  useEffect(() => {
    if (!blob) return undefined;
    let cancelled = false;
    measureImage(blob).then(
      (size) => {
        if (!cancelled) setEntry({ blob, size });
      },
      () => {
        if (cancelled) return;
        dispatch({ type: 'FAULT', scenario: 'file-unavailable' });
        navigate(RECOVERY_PATHS['file-unavailable']);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [blob, dispatch, navigate]);
  return entry !== null && entry.blob === blob ? entry.size : null;
}

export default function Quality() {
  const t = useT('camera');
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const image = useExam((s) => s.image);
  const [issueOpen, setIssueOpen] = useState(false);
  useGuard(image !== null, CAPTURE_PATH);
  const previewUrl = useObjectUrl(image?.original ?? null);
  const size = useImageSize(image?.original ?? null);
  if (!image) return null;

  const lowResolution = size !== null && isLowResolution(size.width, size.height);
  const discard = () => {
    dispatch({ type: 'BACK' });
    navigate(CAPTURE_PATH);
  };
  const review = () => {
    dispatch({ type: 'CONFIRM_IMAGE' });
    navigate(CONSENT_PATH);
  };

  return (
    <AppShell title={t('qualityShell')} onBack={discard} showNav={false}>
      <h1 className="m-0 text-title text-ink">{t('qualityTitle')}</h1>
      <p className="m-0 text-body text-ink">{t('qualityBody')}</p>
      <Card variant="raised" className="items-center gap-2 p-3">
        {previewUrl ? (
          <img src={previewUrl} alt="" decoding="async" className="max-h-72 w-auto max-w-full rounded-chip object-contain" />
        ) : null}
        {image.origin === 'sample' ? <p className="m-0 self-start text-caption text-muted">{t('galleryAttribution')}</p> : null}
      </Card>
      <Card variant="soft" className="gap-1 p-3">
        <p className="m-0 text-body-medium text-ink">{t('qualityDecision')}</p>
        <p className="m-0 text-label text-muted">{t('qualityDecisionBody')}</p>
      </Card>
      {size === null ? <StatusLine message={t('measuring')} tone="info" /> : null}
      {size !== null && lowResolution ? (
        <button
          type="button"
          onClick={() => setIssueOpen(true)}
          className="grid min-h-14 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-card bg-surface px-4 py-3 text-left text-ink shadow-raised outline-offset-2 transition-transform duration-(--motion-card) ease-perma-out active:scale-[0.98] motion-reduce:active:scale-100"
        >
          <IconBlob tint="sky">
            <InfoIcon />
          </IconBlob>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-body text-ink">{t('qualityIssueTitle')}</span>
            <span className="text-caption text-muted">{t('qualityIssueOpen')}</span>
          </span>
          <Glyph className="size-5 -rotate-90 text-muted">
            <ChevronDownIcon />
          </Glyph>
        </button>
      ) : null}
      {size !== null && !lowResolution ? <StatusLine message={t('qualityNoIssues')} tone="success" /> : null}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button fullWidth disabled={size === null} onClick={review}>
          {t('qualityCta')}
        </Button>
        <Button variant="secondary" fullWidth onClick={discard}>
          {t('qualityDifferentSource')}
        </Button>
      </div>
      <Sheet open={issueOpen} onOpenChange={setIssueOpen} title={t('issueSheetTitle')} closeLabel={t('close')}>
        <div className="flex flex-col gap-2">
          <p className="m-0 text-body-medium text-ink">{t('issueLowResTitle')}</p>
          <p className="m-0 text-body text-ink">{t('issueLowResBody')}</p>
        </div>
      </Sheet>
    </AppShell>
  );
}
