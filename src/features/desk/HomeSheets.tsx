import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { homeCopy } from './copy';
import { useT } from './api';

export interface HomeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Scope of the prototype (Protocol card and "Ver alcance" menu item). */
export function ScopeSheet({ open, onOpenChange }: HomeSheetProps) {
  const t = useT(homeCopy);
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

/** Destructive confirm: the safe action (cancel) is first in the focus order. */
export function DiscardSheet({ open, onOpenChange, onConfirm }: DiscardSheetProps) {
  const t = useT(homeCopy);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('discardTitle')} closeLabel={t('close')}>
      <div className="flex flex-col gap-4">
        <p className="m-0 text-body text-ink">{t('discardBody')}</p>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button variant="danger" fullWidth onClick={onConfirm}>
            {t('discardConfirm')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
