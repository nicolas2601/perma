import { useState } from 'react';
import { useNavigate } from '@/app/router';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { AppShell } from '@/features/desk/AppShell';
import { useGuard } from '@/features/desk/useGuard';
import { CONSENT_STAGE_PHASES } from '@/features/desk/guardPhases';
import { CAPTURE_PATH, PROCESSING_PATH, QUALITY_PATH, RECOVERY_PATHS } from '@/features/desk/recoveryPaths';
import { useObjectUrl } from '@/features/desk/useObjectUrl';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Card } from '@/ui/Card';

export default function Consent() {
  const t = useT('consent');
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const phase = useExam((s) => s.phase);
  const image = useExam((s) => s.image);
  const consented = useExam((s) => s.consented);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  useGuard(image !== null && CONSENT_STAGE_PHASES.has(phase), image ? QUALITY_PATH : CAPTURE_PATH);
  const previewUrl = useObjectUrl(image?.upload ?? null);
  if (!image) return null;

  const isSample = image.origin === 'sample';

  const back = () => {
    dispatch({ type: 'BACK' });
    navigate(QUALITY_PATH);
  };

  const canSend = consented && phase === 'consenting';
  const send = () => {
    if (!canSend) return;
    if (navigator.onLine === false) {
      dispatch({ type: 'FAULT', scenario: 'offline' });
      navigate(RECOVERY_PATHS.offline);
      return;
    }
    dispatch({ type: 'SEND' });
    navigate(`${PROCESSING_PATH}${window.location.search}`);
  };

  return (
    <AppShell title={t('shellTitle')} onBack={back} showNav={false}>
      <h1 className="m-0 text-title text-ink">{t('title')}</h1>
      <p className="m-0 text-body text-ink">{t('body')}</p>
      <Card className="items-center gap-2 p-3">
        {previewUrl ? (
          <img src={previewUrl} alt="" decoding="async" className="max-h-40 w-auto max-w-full rounded-chip object-contain" />
        ) : null}
        <p className="m-0 text-caption text-muted">{isSample ? t('sampleCaption') : t('imageCaption')}</p>
        {isSample ? <p className="m-0 text-caption text-muted">{t('attribution')}</p> : null}
      </Card>
      <div className="flex flex-col gap-2">
        <label className="flex min-h-13 cursor-pointer items-center gap-3 rounded-tile border border-solid border-line bg-surface px-4 py-3 text-body text-ink">
          <input
            type="checkbox"
            checked={consented}
            onChange={(event) => dispatch({ type: 'CONSENT', value: event.target.checked })}
            className="size-5 shrink-0 accent-accent"
          />
          <span>{t('consentLabel')}</span>
        </label>
        <p className="m-0 text-caption text-muted">{t('consentHint')}</p>
      </div>
      <button
        type="button"
        onClick={() => setPrivacyOpen(true)}
        className="flex min-h-13 w-full flex-col items-start justify-center rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-ink outline-offset-2"
      >
        <span className="text-body text-ink">{t('privacyTitle')}</span>
        <span className="text-caption text-muted">{t('privacyHint')}</span>
      </button>
      <div className="mt-auto pt-4">
        <Button fullWidth disabled={!canSend} onClick={send}>
          {t('send')}
        </Button>
      </div>
      <Sheet open={privacyOpen} onOpenChange={setPrivacyOpen} title={t('privacyTitle')} closeLabel={t('close')}>
        <p className="m-0 text-body text-ink">{t('privacyBody')}</p>
      </Sheet>
    </AppShell>
  );
}
