import type { Locale } from '@/core/i18n/contract';
import { Button } from '@/ui/Button';
import { copy, type PwaCopyKey } from './copy';
import { useAppUpdate } from './useAppUpdate';
import type { UpdatePhase } from './updateState';

export interface UpdatePromptProps {
  /** False while an unsaved review is open. The update is then shown as blocked, not applied. */
  canReload: boolean;
  locale?: Locale;
}

const DEFAULT_LOCALE: Locale = 'es';

export function UpdatePrompt({ canReload, locale = DEFAULT_LOCALE }: UpdatePromptProps) {
  const update = useAppUpdate({ canReload });
  const text = copy[locale];

  if (update.phase === 'hidden') return null;

  const message = messageFor(update.phase, text);
  return (
    <section
      role="status"
      aria-label={text.regionLabel}
      data-phase={update.phase}
      className="fixed inset-x-3 bottom-3 z-50 flex flex-col gap-2 rounded-tile border border-solid border-line bg-surface p-3 text-label text-ink"
    >
      <p className="m-0">{message}</p>
      {update.phase === 'offline-ready' ? (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={update.dismissOffline}>
            {text.offlineDismiss}
          </Button>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="quiet" onClick={update.dismissUpdate}>
            {text.updateLater}
          </Button>
          <Button
            variant="primary"
            disabled={update.phase === 'update-blocked'}
            onClick={update.applyUpdate}
          >
            {text.updateApply}
          </Button>
        </div>
      )}
    </section>
  );
}

function messageFor(phase: Exclude<UpdatePhase, 'hidden'>, text: Record<PwaCopyKey, string>): string {
  if (phase === 'offline-ready') return text.offlineReady;
  if (phase === 'update-blocked') return text.updateBlocked;
  return text.updateReady;
}
