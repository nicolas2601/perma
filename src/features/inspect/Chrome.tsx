import type { ReactNode } from 'react';
import { IconButton, Notice, cx } from '@/ui';
import { Link, useNavigate } from '@/app/router';
import { setLocale, useLocale, useT } from './api';
import { copy } from './copy';

type ScreenHeaderProps = {
  title: string;
  /** Explicit legal destination of the back control (architecture section 4). */
  backTo: string;
  backLabel: string;
  /** Route of the scope/methods control. */
  infoTo?: string;
  infoLabel: string;
};

/** Top bar shared by the result, viewer, ABCDE, compare, review and guide screens. */
export function ScreenHeader({ title, backTo, backLabel, infoTo = '/guia', infoLabel }: ScreenHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="flex h-15 items-center gap-2 bg-surface px-5">
      <IconButton
        label={backLabel}
        icon={<span aria-hidden="true" className="text-section">‹</span>}
        onClick={() => navigate(backTo)}
      />
      <h1 className="m-0 min-w-0 flex-1 text-header font-medium text-ink">{title}</h1>
      <Link
        to={infoTo}
        aria-label={infoLabel}
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-control border border-solid border-line bg-surface text-section text-muted outline-offset-2"
      >
        <span aria-hidden="true">i</span>
      </Link>
      <LanguageSwitch />
    </header>
  );
}

/** Persistent ES/EN switch. Changing language never touches the exam record or the export ack. */
export function LanguageSwitch() {
  const locale = useLocale();
  const t = useT(copy);
  const nextLocale = locale === 'es' ? 'en' : 'es';
  const label = nextLocale === 'en' ? t('langSwitchToEn') : t('langSwitchToEs');
  const shown = nextLocale === 'en' ? t('langLabelEn') : t('langLabelEs');
  return (
    <button
      type="button"
      lang={nextLocale}
      aria-label={label}
      onClick={() => setLocale(nextLocale)}
      className="inline-flex size-12 shrink-0 items-center justify-center rounded-control border border-solid border-line bg-surface text-header font-medium text-ink outline-offset-2"
    >
      {shown}
    </button>
  );
}

/** Persistent experimental notice. Shown on every screen that displays model output. */
export function ExperimentalNotice({ className }: { className?: string }) {
  const t = useT(copy);
  return (
    <div className={cx('w-full', className)}>
      <Notice label={t('experimentalNotice')}>{t('experimentalNotice')}</Notice>
    </div>
  );
}

/** Fixed bottom action dock (Figma "Fixed action dock"). */
export function ActionDock({ children }: { children: ReactNode }) {
  return <footer className="bg-canvas px-5 py-3">{children}</footer>;
}
