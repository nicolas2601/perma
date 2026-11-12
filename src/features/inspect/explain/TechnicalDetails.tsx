import { useT } from '@/core/i18n/I18nProvider';
import type { ExplainLocale } from '@/core/explain/ita';
import type { InferenceResult, ModelIdentity, SegmentationResult } from '@/core/inference/types';
import { PhotometryCard } from './PhotometryCard';

type TechnicalDetailsProps = {
  result: InferenceResult;
  locale: ExplainLocale;
};

const SUMMARY_CLASS = 'flex min-h-11 cursor-pointer items-center text-body-medium text-ink';

/** Everything technical, collapsed by default: skin index, classifier and segmenter identity, area. */
export function TechnicalDetails({ result, locale }: TechnicalDetailsProps) {
  const t = useT('inspect');
  return (
    <details className="rounded-card bg-surface p-4 shadow-raised">
      <summary className={SUMMARY_CLASS}>{t('technicalTitle')}</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="m-0 text-caption text-muted">{t('technicalIndexNote')}</p>
        <PhotometryCard photometry={result.photometry} locale={locale} />
        <IdentityList
          heading={`${t('technicalClassifierLabel')} ${result.identity.release ?? ''}`.trim()}
          identity={result.identity}
          rows={[t('technicalModel'), t('technicalRecipe')]}
        />
        <SegmenterBlock segmentation={result.segmentation} />
      </div>
    </details>
  );
}

function IdentityList({ heading, identity, rows }: { heading: string; identity: ModelIdentity; rows: string[] }) {
  const t = useT('inspect');
  return (
    <section className="flex flex-col gap-1">
      <h3 className="m-0 text-label text-ink">{heading}</h3>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption text-ink">
        <dt className="text-muted">{rows[0]}</dt>
        <dd className="m-0">{identity.modelId}</dd>
        <dt className="text-muted">{t('technicalChecksum')}</dt>
        <dd className="m-0 break-all">{identity.sha256 ?? t('technicalUnverified')}</dd>
        <dt className="text-muted">{rows[1]}</dt>
        <dd className="m-0">{identity.recipe ?? '—'}</dd>
      </dl>
    </section>
  );
}

function SegmenterBlock({ segmentation }: { segmentation: SegmentationResult | undefined }) {
  const t = useT('inspect');
  if (segmentation?.status !== 'ok') {
    return (
      <section className="flex flex-col gap-1">
        <h3 className="m-0 text-label text-ink">{t('technicalSegmenterLabel')}</h3>
        <p className="m-0 text-caption text-muted">{t('technicalSegmenterUnavailable')}</p>
      </section>
    );
  }
  const { identity } = segmentation;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="m-0 text-label text-ink">{`${t('technicalSegmenterLabel')} ${identity.release}`}</h3>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-caption text-ink">
        <dt className="text-muted">{t('technicalModel')}</dt>
        <dd className="m-0">{identity.modelId}</dd>
        <dt className="text-muted">{t('technicalChecksum')}</dt>
        <dd className="m-0 break-all">{identity.modelSha256}</dd>
        <dt className="text-muted">{t('technicalAreaLabel')}</dt>
        <dd className="m-0">{segmentation.areaFraction.toFixed(3)}</dd>
      </dl>
    </section>
  );
}
