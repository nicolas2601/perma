import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, m, useReducedMotion, type MotionValue } from 'motion/react';
import { Button } from '@/ui';
import { reducedTransition } from '@/ui/motion';
import { useNavigate } from '@/app/router';
import { useExam } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { IDENTITY_ZOOM, reduceFromPreference, type Viewport } from '@/core/motion';
import { useInertiaZoom } from '@/motion';
import { ActionDock, ScreenHeader } from './Chrome';
import { useObjectUrl, isReferenceImage, PUBLIC_REFERENCE_URL } from './useImageSource';
import { useZoomPointers } from './useZoomPointers';

const LABEL_FADE_S = 0.1;

export default function ZoomScreen() {
  const t = useT('inspect');
  const navigate = useNavigate();
  const image = useExam((state) => state.image);
  const src = useObjectUrl(image);
  const reference = isReferenceImage(image);
  const shown = src ?? (reference ? PUBLIC_REFERENCE_URL : null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewport = useViewportSize(viewportRef);
  const reduced = reduceFromPreference(useReducedMotion());
  const zoom = useInertiaZoom({ viewport, reducedMotion: reduced });
  const handlers = useZoomPointers(zoom, viewportRef);
  const zoomed = useZoomedFlag(zoom.scale);
  return (
    <main className="flex h-dvh flex-col bg-canvas lg:h-auto lg:min-h-dvh">
      <ScreenHeader title={t('zoomHeader')} backTo="/inspeccion" backLabel={t('back')} infoLabel={t('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-3 lg:overflow-visible lg:px-8 lg:pb-8">
        <h2 className="m-0 text-title text-ink">{t('zoomHeading')}</h2>
        <p className="m-0 text-body text-ink">{t('zoomIntro')}</p>
        <figure className="m-0 flex flex-col overflow-hidden rounded-tile bg-surface">
          <div ref={viewportRef} {...handlers} className="relative h-80 touch-none overflow-hidden bg-surface lg:h-[calc(100dvh-160px)]">
            {shown ? (
              <m.img
                src={shown}
                alt={reference ? t('imageAltReference') : t('imageAltSession')}
                draggable={false}
                decoding="async"
                className="pointer-events-none absolute inset-0 m-auto max-h-full max-w-full object-contain select-none"
                style={{ x: zoom.x, y: zoom.y, scale: zoom.scale }}
              />
            ) : null}
          </div>
          <figcaption className="flex flex-col gap-0.5 border-t border-solid border-soft-line px-3.5 py-2 text-caption text-ink">
            <span>{reference ? `${t('referenceAttribution')} · ${t('zoomCrop')}` : t('zoomCrop')}</span>
            <span className="text-muted">{t('zoomHint')}</span>
          </figcaption>
        </figure>
        <div className="flex items-center gap-3">
          <ModeLabel zoomed={zoomed} fitLabel={t('toolFit')} zoomLabel={t('toolZoom')} />
          <Button variant="quiet" onClick={zoom.reset} className="ml-auto">
            {t('zoomReset')}
          </Button>
        </div>
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/inspeccion/original')}>
          {t('zoomBackToOriginal')}
        </Button>
      </ActionDock>
    </main>
  );
}

/** Measured viewport size, kept current so pan limits follow the layout. */
function useViewportSize(ref: RefObject<HTMLElement | null>): Viewport {
  const [size, setSize] = useState<Viewport>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

function useZoomedFlag(scale: MotionValue<number>): boolean {
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => scale.on('change', (value) => setZoomed(value > IDENTITY_ZOOM.scale)), [scale]);
  return zoomed;
}

/** Ajustar / Ampliar label crossfades in 100 ms; reduced motion keeps the same 100 ms fade. */
function ModeLabel({ zoomed, fitLabel, zoomLabel }: { zoomed: boolean; fitLabel: string; zoomLabel: string }) {
  const reduce = useReducedMotion();
  const label = zoomed ? zoomLabel : fitLabel;
  const transition = reduce ? reducedTransition : { duration: LABEL_FADE_S };
  return (
    <span className="relative inline-grid min-w-16 text-body-medium text-ink">
      <AnimatePresence initial={false}>
        <m.span
          key={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          className="col-start-1 row-start-1"
        >
          {label}
        </m.span>
      </AnimatePresence>
    </span>
  );
}
