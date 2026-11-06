import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { useT } from '@/core/i18n/I18nProvider';

export interface HomeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
          className="flex min-h-14 w-full cursor-pointer flex-col items-start justify-center gap-1 rounded-tile border border-solid border-line bg-surface px-4 py-3 text-left text-ink outline-offset-2"
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
