import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@/app/router';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { AppShell } from '@/features/desk/AppShell';
import { useGuard } from '@/features/desk/useGuard';
import { PROCESSING_STAGE_PHASES } from '@/features/desk/guardPhases';
import {
  CAPTURE_PATH,
  PROCESSING_PATH,
  QUALITY_PATH,
  RECOVERY_PATHS,
  RESULT_PATH,
} from '@/features/desk/recoveryPaths';
import { illustrationUrl } from '@/assets/illustrations';
import { Glyph } from '@/features/desk/Glyph';
import { Button } from '@/ui/Button';
import { IconBlob } from '@/ui/IconBlob';
import { ChevronDownIcon, CloseIcon } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { StatusLine } from '@/ui/StatusLine';
import {
  beginAnalysis,
  finishAnalysis,
  isAnalysisInFlight,
  predictImage,
  scenarioOfFailure,
  stopAnalysis,
} from './analysis';

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-6 shrink-0 rounded-full border-2 border-solid border-accent border-r-transparent motion-safe:animate-spin"
    />
  );
}

/** Single-flight request for the image in `processing` (G2). The reducer decides which responses still count. */
function useAnalysis(ready: boolean, upload: Blob | null): void {
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  useEffect(() => {
    if (!ready || upload === null) return;
    const controller = beginAnalysis();
    if (controller === null) return;
    predictImage(upload, controller.signal)
      .then(
        (result) => {
          if (controller.signal.aborted || window.location.pathname !== PROCESSING_PATH) return;
          dispatch({ type: 'RESULT_OK', result });
          navigate(RESULT_PATH);
        },
        (error: unknown) => {
          if (controller.signal.aborted || window.location.pathname !== PROCESSING_PATH) return;
          const scenario = scenarioOfFailure(error);
          dispatch({ type: 'FAULT', scenario });
          navigate(RECOVERY_PATHS[scenario]);
        },
      )
      .finally(() => finishAnalysis(controller));
  }, [ready, upload, dispatch, navigate]);
}

/** Back gesture during a pending request reopens the stop sheet instead of leaving silently (G11). */
function useBackGestureGuard(onBlocked: () => void): void {
  useEffect(() => {
    const onPop = () => {
      if (!isAnalysisInFlight()) return;
      window.history.go(1);
      onBlocked();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [onBlocked]);
}

export default function Processing() {
  const t = useT('consent');
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const phase = useExam((s) => s.phase);
  const image = useExam((s) => s.image);
  const [stopOpen, setStopOpen] = useState(false);
  useGuard(image !== null && PROCESSING_STAGE_PHASES.has(phase), image ? QUALITY_PATH : CAPTURE_PATH);
  useAnalysis(phase === 'processing' && image !== null, image?.upload ?? null);
  const openStop = useCallback(() => setStopOpen(true), []);
  useBackGestureGuard(openStop);

  if (!image) return null;

  const confirmStop = () => {
    stopAnalysis();
    dispatch({ type: 'STOP_WAITING' });
    setStopOpen(false);
    navigate(QUALITY_PATH);
  };

  return (
    <AppShell title={t('waitShellTitle')} onBack={openStop} showNav={false}>
      <h1 className="m-0 text-title text-ink">{t('waitTitle')}</h1>
      <p className="m-0 text-body text-ink">{t('waitBody')}</p>
      <img src={illustrationUrl('waitingResponse')} alt="" width={160} height={120} decoding="async" className="h-auto w-40 self-center" />
      <div className="flex items-center gap-3">
        <Spinner />
        <div className="min-w-0 flex-1">
          <StatusLine message={t('waitStatus')} tone="info" />
        </div>
      </div>
      <section className="flex flex-col gap-1">
        <h2 className="m-0 text-body-medium text-ink">{t('waitContextTitle')}</h2>
        <p className="m-0 text-label text-muted">{t('waitContextBody')}</p>
      </section>
      <section className="flex flex-col gap-1">
        <h2 className="m-0 text-body-medium text-ink">{t('waitNoProgressTitle')}</h2>
        <p className="m-0 text-label text-muted">{t('waitNoProgressBody')}</p>
      </section>
      <button
        type="button"
        onClick={openStop}
        className="grid min-h-16 w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-card bg-surface px-4 py-3 text-left text-ink shadow-raised outline-offset-2 transition-transform duration-(--motion-card) ease-perma-out active:scale-[0.98] motion-reduce:active:scale-100"
      >
        <IconBlob tint="butter">
          <CloseIcon />
        </IconBlob>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-body text-ink">{t('waitStop')}</span>
          <span className="text-caption text-muted">{t('waitStopHint')}</span>
        </span>
        <Glyph className="size-5 -rotate-90 text-muted">
          <ChevronDownIcon />
        </Glyph>
      </button>
      <Sheet open={stopOpen} onOpenChange={setStopOpen} title={t('waitStopSheetTitle')} closeLabel={t('close')}>
        <div className="flex flex-col gap-4">
          <h2 className="m-0 text-title text-ink">{t('waitStopHeading')}</h2>
          <p className="m-0 text-body text-ink">{t('waitStopSheetBody')}</p>
          <button
            type="button"
            onClick={() => setStopOpen(false)}
            className="flex min-h-14 w-full items-center rounded-card bg-subtle px-4 py-3 text-left text-body text-ink outline-offset-2"
          >
            {t('waitStopKeep')}
          </button>
          <Button fullWidth onClick={confirmStop}>
            {t('waitStopConfirm')}
          </Button>
        </div>
      </Sheet>
    </AppShell>
  );
}
