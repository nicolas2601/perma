import { Notice } from '@/ui';
import { useT } from '@/core/i18n/I18nProvider';
import type { InferenceResult } from '@/core/inference/types';

const PER_HUNDRED = 100;

/**
 * Shown when the melanoma-priority reading flags melanoma while melanoma is not the top score.
 * Live results only: a simulated result was not computed from this image.
 */
export function MelanomaPriorityNotice({ result }: { result: InferenceResult }) {
  const t = useT('inspect');
  const screening = result.screening;
  if (result.source !== 'live' || screening?.status !== 'ok') return null;
  if (!screening.alert || !screening.differsFromPred) return null;
  const nested = screening.development?.nested;
  const evidence = nested
    ? t('melanomaPriorityEvidence')
        .replace('{recall}', String(Math.round(nested.targetRecall * PER_HUNDRED)))
        .replace('{precision}', String(Math.round(nested.targetPrecision * PER_HUNDRED)))
    : null;
  return (
    <Notice label={t('melanomaPriorityLabel')}>
      <span className="block font-semibold">{t('melanomaPriorityLabel')}</span>
      {t('melanomaPriorityBody')}
      {evidence ? ` ${evidence}` : null}
    </Notice>
  );
}
