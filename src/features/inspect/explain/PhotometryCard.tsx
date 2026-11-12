import { Card } from '@/ui';
import { useT } from '@/core/i18n/I18nProvider';
import { formatItaDegrees, formatOneDecimal, itaCategoryLabel, type ExplainLocale } from '@/core/explain/ita';
import type { PhotometryResult } from '@/core/inference/types';

type PhotometryCardProps = {
  photometry: PhotometryResult | undefined;
  locale: ExplainLocale;
};

/** Colorimetric skin estimate. Never presented as the Fitzpatrick phototype. */
export function PhotometryCard({ photometry, locale }: PhotometryCardProps) {
  const t = useT('inspect');
  if (!photometry || photometry.status === 'unavailable') {
    const reason = photometry?.reason === 'endpoint_missing' ? t('itaEndpointMissing') : t('itaUnavailable');
    return (
      <Card variant="raised" className="shrink-0">
        <p className="m-0 text-body-medium text-ink">{t('itaLabel')}</p>
        <p className="m-0 text-caption text-muted">{reason}</p>
      </Card>
    );
  }
  const headline =
    photometry.status === 'ok' && photometry.itaDeg !== null && photometry.itaCategory !== null
      ? `${t('itaLabel')} ${formatItaDegrees(photometry.itaDeg, locale)} · ${itaCategoryLabel(photometry.itaCategory, locale)}`
      : t('itaIndeterminate');
  const medians = `${t('itaMedianL')} ${formatOneDecimal(photometry.medianL, locale)} · ${t('itaMedianB')} ${formatOneDecimal(photometry.medianB, locale)}`;
  return (
    <Card variant="raised" className="shrink-0">
      <p className="m-0 text-body-medium text-ink">{headline}</p>
      <p className="m-0 text-caption text-muted">{medians}</p>
      <p className="m-0 text-caption text-muted">{t('itaRegion')}</p>
      <p className="m-0 text-caption text-ink">{t('itaNote')}</p>
    </Card>
  );
}
