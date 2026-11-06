import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '@/ui';
import { reducedTransition } from '@/ui/motion';
import { useNavigate } from '@/app/router';
import { useExam, useT } from './api';
import { ActionDock, ScreenHeader } from './Chrome';
import { copy } from './copy';
import { useObjectUrl, isReferenceImage, PUBLIC_REFERENCE_URL } from './useImageSource';
import { viewerCopy } from './viewerCopy';
import { MIN_SCALE } from './zoomMath';
import { useZoomGestures } from './useZoomGestures';

const LABEL_FADE_MS = 0.1;

export default function ZoomScreen() {
  const t = useT(viewerCopy);
  const tCommon = useT(copy);
  const navigate = useNavigate();
  const { image } = useExam();
  const src = useObjectUrl(image);
  const reference = isReferenceImage(image);
  const shown = src ?? (reference ? PUBLIC_REFERENCE_URL : null);
  const { viewportRef, handlers, scale, pan, reset } = useZoomGestures();
  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('zoomTitle')} backTo="/inspeccion" backLabel={tCommon('back')} infoLabel={tCommon('info')} />
      <div ref={viewportRef} {...handlers} className="relative flex-1 touch-none overflow-hidden bg-surface">
        {shown ? (
          <img
            src={shown}
            alt={reference ? t('imageAltReference') : t('imageAltSession')}
            draggable={false}
            decoding="async"
            className="pointer-events-none absolute inset-0 m-auto max-h-full max-w-full object-contain select-none"
            style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})` }}
          />
        ) : null}
      </div>
      <p className="m-0 px-5 pt-2 text-label text-muted">{t('zoomHint')}</p>
      <ActionDock>
        <div className="flex items-center gap-3">
          <ModeLabel zoomed={scale > MIN_SCALE} fitLabel={t('toolFit')} zoomLabel={t('toolZoom')} />
          <Button variant="secondary" onClick={reset} className="flex-1">
            {t('zoomReset')}
          </Button>
          <Button variant="quiet" onClick={() => navigate('/inspeccion')}>
            {t('originalBack')}
          </Button>
        </div>
      </ActionDock>
    </main>
  );
}

/** Ajustar / Ampliar label crossfades in 100 ms; reduced motion keeps the same 100 ms fade. */
function ModeLabel({ zoomed, fitLabel, zoomLabel }: { zoomed: boolean; fitLabel: string; zoomLabel: string }) {
  const reduce = useReducedMotion();
  const label = zoomed ? zoomLabel : fitLabel;
  const transition = reduce ? reducedTransition : { duration: LABEL_FADE_MS };
  return (
    <span className="relative inline-grid min-w-16 text-body-medium text-ink">
      <AnimatePresence initial={false}>
        <motion.span
          key={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="col-start-1 row-start-1"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
