import { useEffect, useState } from 'react';
import { useNavigate } from '@/app/router';
import { AppShell } from '@/features/desk/AppShell';
import { CONSENT_PATH, QUALITY_PATH, RECOVERY_PATHS, RESULT_PATH } from '@/features/desk/recoveryPaths';
import { useExam, useExamDispatch, useGuard, useT } from '@/features/desk/api';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { StatusLine } from '@/ui/StatusLine';
import { InferenceError, type RecoveryScenario } from '@/core/inference/types';
import { processingCopy } from './copy';
import { isAbortError } from './abort';
import { beginAnalysis, createInferenceClient, deadlineFor, finishAnalysis, isAnalysisInFlight, runAnalysis, stopAnalysis } from './api';

/** Scenario for failures that are not typed InferenceErrors: treated as an unavailable service. */
const UNTYPED_FAILURE: RecoveryScenario = 'server-error';

function scenarioOf(error: unknown): RecoveryScenario {
  return error instanceof InferenceError ? error.scenario : UNTYPED_FAILURE;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-6 shrink-0 rounded-full border-2 border-solid border-accent border-r-transparent motion-safe:animate-spin"
    />
  );
}

export default function Processing() {
  const t = useT(processingCopy);
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const image = useExam((s) => s.image);
  const consented = useExam((s) => s.consented);
  const [stopOpen, setStopOpen] = useState(false);
  useGuard(image !== null && consented, CONSENT_PATH);

  useEffect(() => {
    if (!image || !consented) return;
    const controller = beginAnalysis();
    if (!controller) return;
    const search = window.location.search;
    runAnalysis(createInferenceClient(search), { file: image.upload, signal: controller.signal }, deadlineFor(search))
      .then(
        (result) => {
          if (controller.signal.aborted) return;
          dispatch({ type: 'RESULT_OK', result });
          navigate(RESULT_PATH);
        },
        (error: unknown) => {
          if (isAbortError(error) || controller.signal.aborted) return;
          const scenario = scenarioOf(error);
          dispatch({ type: 'FAILED', scenario });
          navigate(RECOVERY_PATHS[scenario]);
        },
      )
      .finally(() => finishAnalysis(controller));
  }, [image, consented, dispatch, navigate]);

  useEffect(() => {
    // Back gesture during a pending request reopens the stop sheet instead of leaving silently.
    const onPop = () => {
      if (!isAnalysisInFlight()) return;
      window.history.go(1);
      setStopOpen(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (!image) return null;

  const confirmStop = () => {
    stopAnalysis();
    dispatch({ type: 'CONSENT', value: false });
    setStopOpen(false);
    navigate(QUALITY_PATH);
  };

  return (
    <AppShell title={t('shellTitle')} onBack={() => setStopOpen(true)} showNav={false}>
      <h1 className="m-0 text-title text-ink">{t('title')}</h1>
      <p className="m-0 text-body text-ink">{t('body')}</p>
      <div className="flex items-center gap-3">
        <Spinner />
        <div className="min-w-0 flex-1">
          <StatusLine message={t('statusWaiting')} tone="info" />
        </div>
      </div>
      <section className="flex flex-col gap-1">
        <h2 className="m-0 text-body-medium text-ink">{t('contextTitle')}</h2>
        <p className="m-0 text-label text-muted">{t('contextBody')}</p>
      </section>
      <section className="flex flex-col gap-1">
        <h2 className="m-0 text-body-medium text-ink">{t('noProgressTitle')}</h2>
        <p className="m-0 text-label text-muted">{t('noProgressBody')}</p>
      </section>
      <button
        type="button"
        onClick={() => setStopOpen(true)}
        className="flex min-h-13 w-full flex-col items-start justify-center rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-ink outline-offset-2"
      >
        <span className="text-body text-ink">{t('stop')}</span>
        <span className="text-caption text-muted">{t('stopHint')}</span>
      </button>
      <Sheet open={stopOpen} onOpenChange={setStopOpen} title={t('stopSheetTitle')} closeLabel={t('close')}>
        <div className="flex flex-col gap-4">
          <p className="m-0 text-body text-ink">{t('stopSheetBody')}</p>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" fullWidth onClick={() => setStopOpen(false)}>
              {t('stopCancel')}
            </Button>
            <Button variant="danger" fullWidth onClick={confirmStop}>
              {t('stopConfirm')}
            </Button>
          </div>
        </div>
      </Sheet>
    </AppShell>
  );
}
