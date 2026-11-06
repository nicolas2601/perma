import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/app/router';
import { AppShell } from '@/features/desk/AppShell';
import { prepareExamImage } from '@/features/desk/imageFile';
import { CameraDeniedError, captureFrame, openCamera, stopStream } from '@/features/desk/cameraStream';
import { CAPTURE_PATH, CONTEXT_PATH, QUALITY_PATH, RECOVERY_PATHS } from '@/features/desk/recoveryPaths';
import { readMockScenario } from '@/features/desk/mockScenario';
import { cameraCopy } from '@/features/desk/copy';
import { useExamDispatch, useExam, useGuard, useT } from '@/features/desk/api';
import { Button } from '@/ui/Button';
import { StatusLine } from '@/ui/StatusLine';

const CAPTURE_FILENAME = 'camera-capture.jpg';

/** Permission state for the mock contract: `?mock=permission` denies the camera without prompting. */
function requestCamera(search: string): Promise<MediaStream> {
  if (readMockScenario(search) === 'permission') return Promise.reject(new CameraDeniedError());
  return openCamera();
}

export default function LiveCamera() {
  const t = useT(cameraCopy);
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const contextSaved = useExam((s) => s.contextSaved);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  useGuard(contextSaved, CONTEXT_PATH);

  useEffect(() => {
    let cancelled = false;
    requestCamera(window.location.search).then(
      (stream) => {
        if (cancelled) return stopStream(stream);
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => undefined);
        }
        setReady(true);
      },
      () => {
        if (!cancelled) navigate(RECOVERY_PATHS.permission);
      },
    );
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [navigate]);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !ready || busy) return;
    setBusy(true);
    try {
      const blob = await captureFrame(video);
      const image = await prepareExamImage(blob, { name: CAPTURE_FILENAME, origin: 'camera' });
      stopStream(streamRef.current);
      streamRef.current = null;
      dispatch({ type: 'IMAGE_LOADED', image });
      navigate(QUALITY_PATH);
    } catch {
      navigate(RECOVERY_PATHS['file-unavailable']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={t('liveShell')} onBack={() => navigate(CAPTURE_PATH)} showNav={false}>
      <h1 className="m-0 text-title text-ink">{t('liveTitle')}</h1>
      <p className="m-0 text-body text-ink">{t('liveBody')}</p>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-tile bg-ink">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label={t('liveTitle')}
          className="size-full object-cover"
        />
        <p className="absolute inset-x-3 bottom-3 m-0 rounded-chip bg-surface p-2 text-caption text-ink">
          {t('guideSlot')}
        </p>
      </div>
      {ready ? null : <StatusLine message={t('starting')} tone="info" />}
      <div className="mt-auto pt-4">
        <Button fullWidth disabled={!ready || busy} onClick={() => void shoot()}>
          {t('shutter')}
        </Button>
      </div>
    </AppShell>
  );
}
