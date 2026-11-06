import { useEffect, useState } from 'react';
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
const OFFLINE_NOTICE_MS = 6000;
const BANNER_CLASS =
  'fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8px)] z-50 flex flex-col gap-2 rounded-tile border border-solid border-line bg-surface p-3 text-label text-ink';

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function UpdatePrompt({ canReload, locale = DEFAULT_LOCALE }: UpdatePromptProps) {
  const update = useAppUpdate({ canReload });
  const text = copy[locale];
  const { phase, dismissOffline } = update;
  useEffect(() => {
    if (phase !== 'offline-ready') return undefined;
    const timer = setTimeout(dismissOffline, OFFLINE_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [phase, dismissOffline]);

  const online = useOnline();
  if (update.phase === 'hidden' && online) return null;

  if (update.phase === 'hidden') {
    return (
      <section role="status" aria-label={text.regionLabel} data-phase="offline" className={BANNER_CLASS}>
        <p className="m-0">{text.offlineReady}</p>
      </section>
    );
  }
  const message = messageFor(update.phase, text);
  return (
    <section
      role="status"
      aria-label={text.regionLabel}
      data-phase={update.phase}
      className={BANNER_CLASS}
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
