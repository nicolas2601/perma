import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/app/router';
import { useExamDispatch } from '@/core/exam/react';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import { useCaptureAdvice } from '@/features/camera/guide/useCaptureAdvice';
import { GuideOverlay } from '@/features/camera/guide/GuideOverlay';
import { AppShell } from '@/features/desk/AppShell';
import { prepareExamImage } from '@/features/desk/imageFile';
import { CameraDeniedError, captureFrame, openCamera, stopStream } from '@/features/desk/cameraStream';
import { isMockFault } from '@/features/desk/mockFault';
import { useCaptureStage } from '@/features/desk/useCaptureStage';
import { CAPTURE_PATH, QUALITY_PATH, RECOVERY_PATHS } from '@/features/desk/recoveryPaths';
import { Button } from '@/ui/Button';
import { StatusLine } from '@/ui/StatusLine';

const CAPTURE_FILENAME = 'camera-capture.jpg';

/** `?mock=permission` (mock build only) denies the camera without prompting. */
function requestCamera(search: string): Promise<MediaStream> {
  if (isMockFault(search, 'permission')) return Promise.reject(new CameraDeniedError());
  return openCamera();
}

/**
 * Live framing guide plus the shutter. The shutter is gated only by the stream and
 * an in-flight capture, never by the guide: advice is optional guidance.
 */
export default function LiveCamera() {
  const t = useT('camera');
  const { locale } = useI18n();
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  useCaptureStage();
  const advice = useCaptureAdvice(videoRef);

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
        if (cancelled) return;
        dispatch({ type: 'FAULT', scenario: 'permission' });
        navigate(RECOVERY_PATHS.permission);
      },
    );
    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [dispatch, navigate]);

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
      dispatch({ type: 'FAULT', scenario: 'file-unavailable' });
      navigate(RECOVERY_PATHS['file-unavailable']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={t('liveShell')} onBack={() => navigate(CAPTURE_PATH)} showNav={false}>
      <div className="flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:content-start lg:items-start lg:gap-x-8 lg:gap-y-6">
        <h1 className="m-0 text-title text-ink lg:col-span-2">{t('liveTitle')}</h1>
        <p className="m-0 text-body text-ink lg:col-span-2 lg:max-w-180">{t('liveBody')}</p>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-tile bg-ink lg:aspect-video lg:max-w-220 lg:col-start-1">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label={t('liveTitle')}
            className="size-full object-cover"
          />
          <div className="absolute inset-0">
            <GuideOverlay advice={advice} locale={locale} />
          </div>
        </div>
        <div className="contents lg:flex lg:flex-col lg:justify-end lg:gap-4 lg:self-stretch lg:col-start-2">
          {ready ? null : <StatusLine message={t('starting')} tone="info" />}
          <div className="mt-auto pt-4 lg:mt-0 lg:pt-0">
            <Button fullWidth className="lg:w-auto lg:px-8" disabled={!ready || busy} onClick={() => void shoot()}>
              {t('shutter')}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
