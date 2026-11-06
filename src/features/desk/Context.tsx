import { useState } from 'react';
import { useNavigate } from '@/app/router';
import { clinicalContextSummary } from '@/core/exam/clinicalContext';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { Button } from '@/ui/Button';
import { ChevronDownIcon } from '@/ui/icons';
import { Glyph } from './Glyph';
import { AppShell } from './AppShell';
import { BODY_SITE_KEYS, ClinicalContextSheet, SITE_LABEL_KEY, SiteSheet, type BodySiteKey } from './ContextSheets';
import { CAPTURE_PATH, DESK_PATH } from './recoveryPaths';

const FIELD_CLASS =
  'flex min-h-13 w-full flex-col items-start justify-center gap-1 rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-ink outline-offset-2';

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
      <div className="mt-auto pt-4">
        <Button fullWidth onClick={save}>
          {t('continue')}
        </Button>
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
