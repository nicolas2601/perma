import { useState } from 'react';
import { useNavigate } from '@/app/router';
import { Button } from '@/ui/Button';
import { ChevronDownIcon } from '@/ui/icons';
import { Glyph } from './Glyph';
import { AppShell } from './AppShell';
import { BODY_SITE_KEYS, ContextDetailsSheet, SITE_LABEL_KEY, SiteSheet, type BodySiteKey } from './ContextSheets';
import { contextCopy } from './copy';
import { useExam, useExamDispatch, useT } from './api';
import { CAPTURE_PATH, DESK_PATH } from './recoveryPaths';

const FIELD_CLASS =
  'flex min-h-13 w-full flex-col items-start justify-center gap-1 rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-ink outline-offset-2';

function isBodySite(value: string | null): value is BodySiteKey {
  return value !== null && (BODY_SITE_KEYS as readonly string[]).includes(value);
}

export default function Context() {
  const t = useT(contextCopy);
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const storedSite = useExam((s) => s.bodySite);
  const [site, setSite] = useState<BodySiteKey | null>(isBodySite(storedSite) ? storedSite : null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const siteLabel = site === null ? t('siteEmpty') : t(SITE_LABEL_KEY[site]);

  const save = () => {
    dispatch({ type: 'SET_SITE', site });
    dispatch({ type: 'CONTEXT_SAVED' });
    navigate(CAPTURE_PATH);
  };

  return (
    <AppShell title={t('modalityValue')} onBack={() => navigate(DESK_PATH)} showNav={false}>
      <h1 className="m-0 text-title text-ink">{t('headline')}</h1>
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
        <button type="button" className={FIELD_CLASS} onClick={() => setDetailsOpen(true)}>
          <span className="text-body text-ink">{t('clinicalContext')}</span>
          <span className="text-caption text-muted">{t('clinicalContextHint')}</span>
        </button>
      </div>
      <div className="mt-auto pt-4">
        <Button fullWidth onClick={save}>
          {t('continue')}
        </Button>
      </div>
      <ContextDetailsSheet open={detailsOpen} onOpenChange={setDetailsOpen} />
      <SiteSheet open={siteOpen} onOpenChange={setSiteOpen} selected={site} onSelect={setSite} />
    </AppShell>
  );
}
