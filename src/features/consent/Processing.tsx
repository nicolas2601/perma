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
import { Button } from '@/ui/Button';
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
        className="flex min-h-13 w-full flex-col items-start justify-center rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-ink outline-offset-2"
      >
        <span className="text-body text-ink">{t('waitStop')}</span>
        <span className="text-caption text-muted">{t('waitStopHint')}</span>
      </button>
      <Sheet open={stopOpen} onOpenChange={setStopOpen} title={t('waitStopSheetTitle')} closeLabel={t('close')}>
        <div className="flex flex-col gap-4">
          <p className="m-0 text-body text-ink">{t('waitStopSheetBody')}</p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" fullWidth onClick={() => setStopOpen(false)}>
              {t('waitStopCancel')}
            </Button>
            <Button variant="danger" fullWidth onClick={confirmStop}>
              {t('waitStopConfirm')}
            </Button>
          </div>
        </div>
      </Sheet>
    </AppShell>
  );
}
