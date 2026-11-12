import { useT } from '@/core/i18n/I18nProvider';
import type { ExplainLocale } from '@/core/explain/ita';
import type { InferenceResult } from '@/core/inference/types';
import { PhotometryCard } from './PhotometryCard';

type TechnicalDetailsProps = {
  result: InferenceResult;
  locale: ExplainLocale;
};

/** Everything technical, collapsed by default: skin index, model identity. Nothing removed, only moved. */
export function TechnicalDetails({ result, locale }: TechnicalDetailsProps) {
  const t = useT('inspect');
  const identity = result.identity;
  return (
    <details className="rounded-card bg-surface p-4 shadow-raised">
      <summary className="cursor-pointer text-body-medium text-ink">{t('technicalTitle')}</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="m-0 text-caption text-muted">{t('technicalIndexNote')}</p>
        <PhotometryCard photometry={result.photometry} locale={locale} />
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption text-ink">
          <dt className="text-muted">{t('technicalModel')}</dt>
          <dd className="m-0">{identity.modelId}</dd>
          <dt className="text-muted">{t('technicalRelease')}</dt>
          <dd className="m-0">{identity.release ?? '—'}</dd>
          <dt className="text-muted">{t('technicalChecksum')}</dt>
          <dd className="m-0 break-all">{identity.sha256 ?? t('technicalUnverified')}</dd>
          <dt className="text-muted">{t('technicalRecipe')}</dt>
          <dd className="m-0">{identity.recipe ?? '—'}</dd>
        </dl>
      </div>
    </details>
  );
}
