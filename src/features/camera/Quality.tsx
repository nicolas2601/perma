import { useEffect, useState } from 'react';
import { useNavigate } from '@/app/router';
import { AppShell } from '@/features/desk/AppShell';
import { isLowResolution, measureImage } from '@/features/desk/imageSource';
import { CAPTURE_PATH, CONSENT_PATH, RECOVERY_PATHS } from '@/features/desk/recoveryPaths';
import { cameraCopy } from '@/features/desk/copy';
import { useExam, useExamDispatch, useGuard, useT } from '@/features/desk/api';
import { useObjectUrl } from '@/features/desk/useObjectUrl';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
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
  const [entry, setEntry] = useState<SizeEntry | null>(null);
  useEffect(() => {
    if (!blob) return undefined;
    let cancelled = false;
    measureImage(blob).then(
      (size) => {
        if (!cancelled) setEntry({ blob, size });
      },
      () => {
        if (!cancelled) navigate(RECOVERY_PATHS['file-unavailable']);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [blob, navigate]);
  return entry !== null && entry.blob === blob ? entry.size : null;
}

export default function Quality() {
  const t = useT(cameraCopy);
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
    dispatch({ type: 'IMAGE_DISCARDED' });
    navigate(CAPTURE_PATH);
  };

  return (
    <AppShell title={t('qualityShell')} onBack={discard}>
      <h1 className="m-0 text-title text-ink">{t('qualityTitle')}</h1>
      <p className="m-0 text-body text-ink">{t('qualityBody')}</p>
      <Card className="items-center gap-2 p-3">
        {previewUrl ? (
          <img src={previewUrl} alt="" decoding="async" className="max-h-72 w-auto max-w-full rounded-chip object-contain" />
        ) : null}
        {image.origin === 'sample' ? <p className="m-0 self-start text-caption text-muted">{t('galleryAttribution')}</p> : null}
      </Card>
      <Card className="gap-1 p-3">
        <p className="m-0 text-body-medium text-ink">{t('qualityDecision')}</p>
        <p className="m-0 text-label text-muted">{t('qualityDecisionBody')}</p>
      </Card>
      {size === null ? <StatusLine message={t('measuring')} tone="info" /> : null}
      {size !== null && lowResolution ? (
        <button
          type="button"
          onClick={() => setIssueOpen(true)}
          className="flex min-h-13 w-full flex-col items-start justify-center rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-ink outline-offset-2"
        >
          <span className="text-body text-ink">{t('qualityIssueTitle')}</span>
          <span className="text-caption text-muted">{t('qualityIssueOpen')}</span>
        </button>
      ) : null}
      {size !== null && !lowResolution ? <StatusLine message={t('qualityNoIssues')} tone="success" /> : null}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button fullWidth disabled={size === null} onClick={() => navigate(CONSENT_PATH)}>
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
