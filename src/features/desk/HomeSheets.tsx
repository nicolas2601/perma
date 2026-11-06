import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import type { Locale } from '@/core/i18n/contract';

export interface HomeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OPTION_ROW =
  'flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-body text-ink outline-offset-2 disabled:cursor-not-allowed disabled:border-soft-line disabled:bg-disabled-surface disabled:text-disabled-text';

export interface OptionsSheetProps extends HomeSheetProps {
  /** Delete is offered only when the record holds something to erase. */
  hasContent: boolean;
  onScope: () => void;
  onGuide: () => void;
  onDelete: () => void;
}

interface OptionRowProps {
  label: string;
  value?: string;
  disabled?: boolean;
  hint?: string;
  onClick: () => void;
}

function OptionRow({ label, value, disabled = false, hint, onClick }: OptionRowProps) {
  return (
    <button type="button" className={OPTION_ROW} disabled={disabled} onClick={onClick}>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span>{label}</span>
        {hint ? <span className="text-caption text-muted">{hint}</span> : null}
      </span>
      {value ? <span className="shrink-0 text-label text-muted">{value}</span> : null}
    </button>
  );
}

/** Home "..." menu: four large rows. Focus returns to the trigger when the sheet closes. */
export function OptionsSheet({ open, onOpenChange, hasContent, onScope, onGuide, onDelete }: OptionsSheetProps) {
  const t = useT('desk');
  const tFull = useT('');
  const { locale, setLocale } = useI18n();
  const next: Locale = locale === 'es' ? 'en' : 'es';
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('menuTitle')} closeLabel={t('close')}>
      <div className="flex flex-col gap-3">
        <OptionRow label={t('scopeTitle')} onClick={onScope} />
        <OptionRow
          label={t('languageLabel')}
          value={tFull(`core.locale.${locale}`)}
          onClick={() => setLocale(next)}
        />
        <OptionRow label={t('menuGuide')} onClick={onGuide} />
        <OptionRow
          label={t('menuDelete')}
          disabled={!hasContent}
          hint={hasContent ? undefined : t('menuDeleteHint')}
          onClick={onDelete}
        />
      </div>
    </Sheet>
  );
}

/** Scope of the prototype (Protocol card and "Ver alcance" menu item). */
export function ScopeSheet({ open, onOpenChange }: HomeSheetProps) {
  const t = useT('desk');
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('scopeTitle')} closeLabel={t('close')}>
      <div className="flex flex-col gap-4 text-body text-ink">
        <p className="m-0">{t('scopeBody')}</p>
        <p className="m-0 text-label text-muted">{t('protocolStatus')}</p>
      </div>
    </Sheet>
  );
}

export interface DiscardSheetProps extends HomeSheetProps {
  onConfirm: () => void;
}

/** Destructive confirm per Figma 141:2420: keep-card (cancel) above, erase-and-start primary below. */
export function DiscardSheet({ open, onOpenChange, onConfirm }: DiscardSheetProps) {
  const t = useT('desk');
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('discardTitle')} closeLabel={t('close')}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-body text-ink">{t('discardBody')}</p>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="grid min-h-14 w-full cursor-pointer justify-items-start content-center gap-1 rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-ink outline-offset-2"
        >
          <span className="text-body text-ink">{t('discardKeep')}</span>
          <span className="text-caption text-muted">{t('discardKeepBody')}</span>
        </button>
        <Button fullWidth onClick={onConfirm}>
          {t('discardConfirm')}
        </Button>
      </div>
    </Sheet>
  );
}
