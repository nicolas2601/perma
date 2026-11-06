import { useEffect, useRef, type ReactNode } from 'react';
import type { Locale } from '@/core/i18n/contract';
import { GUIDE_CROP_FRACTION } from '@/core/capture/constants';
import type { Advice } from '@/core/capture/types';
import { copy } from './copy';

const VIBRATION_MS = 40;

export interface GuideOverlayProps {
  /** Null until the first advice; `mode: 'manual'` shows the static manual copy. */
  readonly advice: Advice | null;
  readonly locale: Locale;
  /** User preference. Off by default; vibration never replaces the visual advice. */
  readonly vibrate?: boolean;
  /** Capture controls. They are rendered as given and never disabled by advice. */
  readonly children?: ReactNode;
}

const TRANSITION = 'transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-opacity motion-reduce:duration-100';

type CopyKey = keyof typeof copy.es;

function adviceText(advice: Advice | null, locale: Locale): string {
  const table = copy[locale];
  if (!advice) return '';
  if (advice.mode === 'manual') return table['guide.manual'];
  return advice.id === 'none' ? '' : table[`advice.${advice.id}` as CopyKey];
}

function useVibrationOnChange(advice: Advice | null, enabled: boolean): void {
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const id = advice?.mode === 'automatic' && advice.id !== 'none' ? advice.id : null;
    if (id !== null && id !== previous.current && enabled && typeof navigator.vibrate === 'function') {
      navigator.vibrate(VIBRATION_MS);
    }
    previous.current = id;
  }, [advice, enabled]);
}

/**
 * Presentational guide: a square crop frame (72% of the shorter side) and one advice line at a time.
 * Never says that blur was detected or that quality was approved. Motion is opacity and transform only,
 * and reduced to a short crossfade under prefers-reduced-motion.
 */
export function GuideOverlay({ advice, locale, vibrate = false, children }: GuideOverlayProps) {
  const table = copy[locale];
  const text = adviceText(advice, locale);
  useVibrationOnChange(advice, vibrate);
  const visible = text !== '';
  return (
    <div className="relative size-full">
      <div
        aria-hidden="true"
        data-testid="guide-crop"
        className="pointer-events-none absolute top-1/2 left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-white/90 shadow-[0_0_0_100vmax_rgb(0_0_0/0.25)]"
        style={{ width: `${GUIDE_CROP_FRACTION * 100}%` }}
      />
      <p
        role="status"
        aria-live="polite"
        aria-label={table['guide.label']}
        className={`absolute inset-x-4 bottom-4 rounded-lg bg-black/70 px-4 py-3 text-center text-base text-white ${TRANSITION} ${visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
      >
        {text}
      </p>
      <p className="sr-only">{table['guide.disclaimer']}</p>
      {children}
    </div>
  );
}
