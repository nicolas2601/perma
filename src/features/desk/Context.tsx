import { useState } from 'react';
import { useNavigate } from '@/app/router';
import { clinicalContextSummary } from '@/core/exam/clinicalContext';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { illustrationUrl } from '@/assets/illustrations';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { IconBlob } from '@/ui/IconBlob';
import { ChevronDownIcon, InfoIcon } from '@/ui/icons';
import { Glyph } from './Glyph';
import { AppShell } from './AppShell';
import { BODY_SITE_KEYS, ClinicalContextSheet, SITE_LABEL_KEY, SiteSheet, type BodySiteKey } from './ContextSheets';
import { CAPTURE_PATH, DESK_PATH } from './recoveryPaths';

const FIELD_CLASS =
  'flex min-h-14 w-full flex-col items-start justify-center gap-1 rounded-card bg-surface px-4 py-3 text-left text-ink shadow-raised outline-offset-2';

function isBodySite(value: string | null): value is BodySiteKey {
  return value !== null && (BODY_SITE_KEYS as readonly string[]).includes(value);
}

export default function Context() {
  const t = useT('desk');
  const tFull = useT('');
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const storedSite = useExam((s) => s.record.bodySite);
  const storedContext = useExam((s) => s.record.clinicalContext);
  const [site, setSite] = useState<BodySiteKey | null>(isBodySite(storedSite) ? storedSite : null);
  const [contextOpen, setContextOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const siteLabel = site === null ? t('siteEmpty') : t(SITE_LABEL_KEY[site]);

  const save = () => {
    dispatch({ type: 'SET_SITE', site });
    navigate(CAPTURE_PATH);
  };

  return (
    <AppShell title={t('contextShell')} onBack={() => navigate(DESK_PATH)} showNav={false}>
      <div className="flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-12 lg:content-start lg:items-start lg:gap-x-8 lg:gap-y-6">
        <div className="flex flex-1 flex-col gap-5 lg:col-span-7">
          <h1 className="m-0 text-title text-ink">{t('contextHeadline')}</h1>
          <p className="m-0 text-body text-muted">{t('intro')}</p>
          <div className="flex flex-col gap-3">
            <div className={FIELD_CLASS}>
              <span className="text-caption text-muted">{t('modality')}</span>
              <span className="flex w-full items-center justify-between text-body text-ink">
                {t('modalityValue')}
                <Glyph className="size-5"><ChevronDownIcon /></Glyph>
              </span>
            </div>
            <button type="button" className={FIELD_CLASS} onClick={() => setSiteOpen(true)}>
              <span className="text-caption text-muted">{t('site')}</span>
              <span className="text-body text-ink">{siteLabel}</span>
            </button>
            <button type="button" className={FIELD_CLASS} onClick={() => setContextOpen(true)}>
              <span className="text-body text-ink">{t('clinicalContext')}</span>
              <span className="text-caption text-muted">{clinicalContextSummary(storedContext, tFull)}</span>
            </button>
          </div>
          <div className="mt-auto pt-4 lg:mt-0 lg:pt-0">
            <Button fullWidth className="lg:w-auto lg:px-8" onClick={save}>
              {t('continue')}
            </Button>
          </div>
        </div>
        <aside className="hidden lg:col-span-5 lg:block">
          <Card variant="soft" tint="sky" className="gap-5 p-8">
            <IconBlob tint="sky" tone="surface" size={48}>
              <InfoIcon />
            </IconBlob>
            <h2 className="m-0 text-section text-ink">{t('privacyCardTitle')}</h2>
            <img src={illustrationUrl('consentPrivacy')} alt="" width={160} height={120} decoding="async" className="h-auto w-40" />
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-label text-ink">
              <li className="flex gap-3"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-deep-sky" />{t('privacyCardStay')}</li>
              <li className="flex gap-3"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-deep-sky" />{t('privacyCardOptional')}</li>
              <li className="flex gap-3"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-deep-sky" />{t('privacyCardModel')}</li>
            </ul>
          </Card>
        </aside>
      </div>
      <ClinicalContextSheet
        open={contextOpen}
        onOpenChange={setContextOpen}
        context={storedContext}
        onSave={(context) => dispatch({ type: 'SET_CLINICAL_CONTEXT', context })}
      />
      <SiteSheet open={siteOpen} onOpenChange={setSiteOpen} selected={site} onSelect={setSite} />
    </AppShell>
  );
}
