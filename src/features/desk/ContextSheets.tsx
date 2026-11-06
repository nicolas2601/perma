import { Sheet } from '@/ui/Sheet';
import { cx } from '@/ui/cx';
import { contextCopy } from './copy';
import { useT } from './api';

export const BODY_SITE_KEYS = ['face', 'scalp', 'trunk', 'upperLimb', 'lowerLimb'] as const;
export type BodySiteKey = (typeof BODY_SITE_KEYS)[number];

export const SITE_LABEL_KEY = {
  face: 'siteFace',
  scalp: 'siteScalp',
  trunk: 'siteTrunk',
  upperLimb: 'siteUpperLimb',
  lowerLimb: 'siteLowerLimb',
} as const satisfies Record<BodySiteKey, keyof (typeof contextCopy)['es']>;

interface SheetBase {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContextDetailsSheet({ open, onOpenChange }: SheetBase) {
  const t = useT(contextCopy);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('contextDetailsTitle')} closeLabel={t('close')}>
      <p className="m-0 text-body text-ink">{t('contextDetailsBody')}</p>
    </Sheet>
  );
}

export interface SiteSheetProps extends SheetBase {
  selected: BodySiteKey | null;
  onSelect: (site: BodySiteKey | null) => void;
}

/** Fixed site list (architecture section 2). Selecting closes the sheet. */
export function SiteSheet({ open, onOpenChange, selected, onSelect }: SiteSheetProps) {
  const t = useT(contextCopy);
  const choose = (site: BodySiteKey | null) => {
    onSelect(site);
    onOpenChange(false);
  };
  const option = (site: BodySiteKey | null, label: string) => (
    <button
      key={site ?? 'none'}
      type="button"
      aria-pressed={selected === site}
      onClick={() => choose(site)}
      className={cx(
        'flex min-h-13 w-full items-center rounded-control border border-solid px-4 text-left text-body',
        selected === site ? 'border-accent bg-subtle text-ink' : 'border-line bg-surface text-ink',
      )}
    >
      {label}
    </button>
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('siteTitle')} closeLabel={t('close')}>
      <div className="flex flex-col gap-2">
        {option(null, t('siteNone'))}
        {BODY_SITE_KEYS.map((site) => option(site, t(SITE_LABEL_KEY[site])))}
      </div>
    </Sheet>
  );
}
