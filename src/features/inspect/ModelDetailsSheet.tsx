import { APP_VERSION } from '@/app/version';
import type { InferenceResult } from '@/core/inference/types';
import { Badge, Button, Sheet } from '@/ui';
import { useT } from '@/core/i18n/I18nProvider';

type ModelDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: InferenceResult;
};

type IdentityRow = { label: string; value: string };

function Row({ label, value }: IdentityRow) {
  return (
    <div className="flex min-h-14 flex-col justify-center gap-0.5 rounded-tile bg-surface px-4 py-3">
      <dt className="text-body-medium text-ink">{label}</dt>
      <dd className="m-0 break-all text-label text-muted">{value}</dd>
    </div>
  );
}

/** Model identity from the status payload and the request, or the explicit mock label. Never invented. */
export function ModelDetailsSheet({ open, onOpenChange, result }: ModelDetailsSheetProps) {
  const t = useT('inspect');
  const { identity } = result;
  const simulated = result.source === 'mock';
  const verified =
    identity.sha256Verified === null ? t('notAvailable') : identity.sha256Verified ? t('verifiedYes') : t('verifiedNo');
  const rows: IdentityRow[] = [
    { label: t('modelIdLabel'), value: result.model },
    { label: t('modelModeLabel'), value: result.mode },
    { label: t('modelRecipeLabel'), value: identity.recipe ?? t('notAvailable') },
    { label: t('modelReleaseLabel'), value: identity.release ?? t('notAvailable') },
    { label: t('modelShaLabel'), value: identity.sha256 ?? t('notAvailable') },
    { label: t('modelVerifiedLabel'), value: verified },
    { label: t('modelSourceLabel'), value: simulated ? t('sourceMock') : t('sourceLive') },
    { label: t('appVersionLabel'), value: APP_VERSION },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('modelSheetTitle')} closeLabel={t('close')}>
      <div className="flex flex-col gap-3">
        {simulated ? <Badge tone="simulated">{t('mockBadge')}</Badge> : null}
        <p className="m-0 text-body text-ink">{t('modelSheetIntro')}</p>
        <dl className="m-0 flex flex-col gap-2">
          {rows.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
        </dl>
        <Button fullWidth variant="secondary" onClick={() => onOpenChange(false)}>
          {t('backToResult')}
        </Button>
      </div>
    </Sheet>
  );
}
