import { useRef, useState } from 'react';
import { getInferenceClient } from '@/core/inference';
import { formatItaDegrees } from '@/core/explain/ita';
import { createToneCache, TONE_STEP_KEYS, TONE_STOPS, type ToneStop } from '@/core/explain/toneCache';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import type { InferenceResult, ToneSimulation } from '@/core/inference/types';
import { Badge, Button, cx } from '@/ui';

type ToneAuditProps = {
  result: InferenceResult;
  /** Upload bytes of the analysed image: the simulation must start from the same pixels. */
  file: Blob;
  /** Object URL of the unmodified original (shown when the simulated view is off). */
  src: string | null;
};

const STEP_INDEX_MIN = 0;
const STEP_INDEX_MAX = TONE_STOPS.length - 1;
const ORIGINAL_INDEX = TONE_STOPS.indexOf(0);

/**
 * Tone robustness audit. The slider only chooses a stop; the service is called only by "Simular".
 * Results live in memory per delta for this mount: never persisted, never exported.
 */
export function ToneAudit({ result, file, src }: ToneAuditProps) {
  const t = useT('inspect');
  const { locale } = useI18n();
  const [stepIndex, setStepIndex] = useState(ORIGINAL_INDEX);
  const delta: ToneStop = TONE_STOPS[stepIndex] ?? 0;
  const [view, setView] = useState<'original' | 'simulated'>('original');
  const [simulation, setSimulation] = useState<ToneSimulation | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const cache = useRef(createToneCache<ToneSimulation>());
  const mask = result.segmentation?.status === 'ok' ? result.segmentation.maskPngBase64 : undefined;

  const onSlide = (value: string) => {
    const next = Number(value);
    if (Number.isInteger(next) && next >= STEP_INDEX_MIN && next <= STEP_INDEX_MAX) setStepIndex(next);
  };

  const simulate = async () => {
    if (delta === 0) {
      setView('original');
      return;
    }
    const cached = cache.current.get(delta);
    if (cached) {
      setSimulation(cached);
      setView('simulated');
      return;
    }
    if (mask === undefined) return;
    setBusy(true);
    setFailed(false);
    try {
      const next = await getInferenceClient().simulateTone({ file, maskPngBase64: mask, deltaL: delta });
      cache.current.set(delta, next);
      setSimulation(next);
      setView('simulated');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const before = result.photometry?.status === 'ok' ? result.photometry.itaDeg : null;
  const after = simulation?.photometry.status === 'ok' ? simulation.photometry.itaDeg : null;
  const showSimulated = view === 'simulated' && simulation !== null;
  const shownSrc = showSimulated ? `data:image/webp;base64,${simulation.imageWebpBase64}` : src;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 text-title text-ink">{t('toneTitle')}</h2>
      <p className="m-0 text-body text-ink">{t('toneExplain')}</p>
      <p className="m-0 text-caption text-muted">{t('toneRampNote')}</p>
      <figure className="m-0 flex flex-col gap-2 overflow-hidden rounded-tile bg-surface">
        {shownSrc ? (
          <img src={shownSrc} alt={showSimulated ? t('toneSimulated') : t('toneOriginal')} decoding="async" className="block h-64 w-full object-contain" />
        ) : null}
        {showSimulated ? <Badge tone="simulated">{t('toneBadge')}</Badge> : null}
      </figure>
      <div className="flex gap-2" role="group" aria-label={t('toneTitle')}>
        <Button variant="quiet" aria-pressed={view === 'original'} onClick={() => setView('original')}>
          {t('toneOriginal')}
        </Button>
        <Button variant="quiet" aria-pressed={view === 'simulated'} disabled={simulation === null} onClick={() => setView('simulated')}>
          {t('toneSimulated')}
        </Button>
      </div>
      <input
        type="range"
        min={STEP_INDEX_MIN}
        max={STEP_INDEX_MAX}
        step={1}
        value={stepIndex}
        aria-label={t('toneSlider')}
        aria-valuetext={t(TONE_STEP_KEYS[stepIndex] ?? 'toneStep0')}
        onChange={(event) => onSlide(event.target.value)}
        className={cx('h-11 w-full accent-accent')}
      />
      <p className="m-0 text-caption text-ink">{t(TONE_STEP_KEYS[stepIndex] ?? 'toneStep0')}</p>
      <Button fullWidth disabled={mask === undefined || busy} onClick={() => void simulate()}>
        {busy ? t('toneSimulating') : t('toneSimulate')}
      </Button>
      {delta === 0 ? <p className="m-0 text-caption text-muted">{t('toneZeroNote')}</p> : null}
      {mask === undefined ? <p className="m-0 text-caption text-muted">{t('toneNoMask')}</p> : null}
      {failed ? <p className="m-0 text-caption text-muted">{t('toneFailed')}</p> : null}
      <p className="m-0 text-caption text-ink">
        {t('toneBefore')}: {before === null ? '—' : formatItaDegrees(before, locale)}
        {showSimulated ? ` · ${t('toneAfter')}: ${after === null ? '—' : formatItaDegrees(after, locale)}` : null}
      </p>
    </div>
  );
}
