import type { InferenceResult } from '@/core/inference/types';
import { Sheet } from '@/ui';
import { useT } from './api';
import { copy } from './copy';

type ModelDetailsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: InferenceResult;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-solid border-soft-line py-3 last:border-b-0">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="m-0 break-all text-body-medium text-ink">{value}</dd>
    </div>
  );
}

/** Model identity from the status payload, or the explicit mock label. Never invented. */
export function ModelDetailsSheet({ open, onOpenChange, result }: ModelDetailsSheetProps) {
  const t = useT(copy);
  const { identity } = result;
  const verified =
    identity.sha256Verified === null ? t('notAvailable') : identity.sha256Verified ? t('verifiedYes') : t('verifiedNo');
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('modelSheetTitle')}
      description={t('modelSheetDescription')}
      closeLabel={t('close')}
    >
      <dl className="m-0">
        <Field label={t('modelSourceLabel')} value={result.source === 'mock' ? t('sourceMock') : t('sourceLive')} />
        <Field label={t('modelIdLabel')} value={identity.modelId} />
        <Field label={t('modelShaLabel')} value={identity.sha256 ?? t('notAvailable')} />
        <Field label={t('modelVerifiedLabel')} value={verified} />
        <Field label={t('modelRecipeLabel')} value={identity.recipe ?? t('notAvailable')} />
        <Field label={t('modelReleaseLabel')} value={identity.release ?? t('notAvailable')} />
      </dl>
    </Sheet>
  );
}
