import { useT } from '@/core/i18n/I18nProvider';
import type { InferenceResult } from '@/core/inference/types';
import { cx } from '@/ui';
import { useContourLayer } from './contourLayer';

const LABEL_ID = 'contour-switch-label';
const REASON_ID = 'contour-switch-reason';

/** role=switch, default OFF. Disabled with a reason when the live segmentation is not ok. */
export function ContourSwitch({ result }: { result: InferenceResult }) {
  const t = useT('inspect');
  const enabled = useContourLayer((state) => state.enabled);
  const setEnabled = useContourLayer((state) => state.setEnabled);
  const segmentation = result.segmentation;
  const available = segmentation?.status === 'ok';
  const reason =
    segmentation?.status === 'unavailable' && segmentation.reason === 'endpoint_missing'
      ? t('contourEndpointMissing')
      : t('contourUnavailable');
  const on = available && enabled;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span id={LABEL_ID} className="text-body-medium text-ink">
          {t('contourSwitch')}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={LABEL_ID}
          aria-describedby={available ? undefined : REASON_ID}
          disabled={!available}
          onClick={() => setEnabled(!enabled)}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          <span
            aria-hidden="true"
            className={cx(
              'relative block h-6 w-11 rounded-full transition-colors duration-150',
              on ? 'bg-accent' : 'bg-line',
            )}
          >
            <span
              className={cx(
                'absolute left-0.5 top-0.5 block size-5 rounded-full bg-surface transition-transform duration-150',
                on ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </span>
        </button>
      </div>
      {on ? <p className="m-0 text-caption text-muted">{t('contourCaption')}</p> : null}
      {available ? null : (
        <p id={REASON_ID} className="m-0 text-caption text-muted">
          {reason}
        </p>
      )}
    </div>
  );
}
