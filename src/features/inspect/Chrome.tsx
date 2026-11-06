import type { ReactNode } from 'react';
import { IconButton, Notice, cx } from '@/ui';
import { Link, useNavigate } from '@/app/router';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import { InfoGlyphIcon } from './toolIcons';

type ScreenHeaderProps = {
  title: string;
  /** Explicit legal destination of the back control (architecture section 4). */
  backTo: string;
  backLabel: string;
  /** Route of the scope/methods control. */
  infoTo?: string;
  infoLabel: string;
  /** Optional screen action placed before the info control (e.g. the viewer tools menu). */
  trailing?: ReactNode;
};

/** Desktop (lg): the rail owns the language switch and the guide link, so the header keeps only back and title. */
const HEADER_CLASS =
  'flex min-h-15 flex-wrap items-center gap-2 bg-surface px-5 py-1 lg:bg-canvas lg:px-8 lg:pb-2 lg:pt-6';
const TITLE_CLASS = 'm-0 min-w-0 flex-1 truncate text-header font-medium text-ink lg:text-section lg:font-semibold';
const CONTROL_CLASS = 'inline-flex size-12 shrink-0 items-center justify-center rounded-control border border-solid border-line bg-surface text-section text-muted outline-offset-2';

/** Top bar shared by the result, viewer, ABCDE, compare, review and guide screens. */
export function ScreenHeader({ title, backTo, backLabel, infoTo = '/guia', infoLabel, trailing }: ScreenHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={HEADER_CLASS}>
      <IconButton
        label={backLabel}
        icon={<span aria-hidden="true" className="text-section">‹</span>}
        onClick={() => navigate(backTo)}
      />
      <h1 className={TITLE_CLASS}>{title}</h1>
      {trailing}
      <Link to={infoTo} aria-label={infoLabel} className={cx(CONTROL_CLASS, 'lg:hidden')}>
        <InfoGlyphIcon />
      </Link>
      <LanguageSwitch className="lg:hidden" />
    </header>
  );
}

/** Persistent ES/EN switch. Changing language never touches the exam record or the export ack. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const t = useT('inspect');
  const nextLocale = locale === 'es' ? 'en' : 'es';
  const label = nextLocale === 'en' ? t('langSwitchToEn') : t('langSwitchToEs');
  const shown = nextLocale === 'en' ? t('langLabelEn') : t('langLabelEs');
  return (
    <button
      type="button"
      lang={nextLocale}
      aria-label={label}
      onClick={() => setLocale(nextLocale)}
      className={cx(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-control border border-solid border-line bg-surface text-header font-medium text-ink outline-offset-2',
        className,
      )}
    >
      {shown}
    </button>
  );
}

/** Persistent experimental notice. Shown on every screen that displays model output. */
export function ExperimentalNotice({ className }: { className?: string }) {
  const t = useT('inspect');
  return (
    <div className={cx('w-full', className)}>
      <Notice label={t('experimentalNotice')}>{t('experimentalNotice')}</Notice>
    </div>
  );
}

/**
 * Bottom action dock (Figma "Fixed action dock"). Below lg it is the full-bleed bar. On desktop it
 * stays in the content flow: content-width actions aligned right, never a full-width bar.
 */
export function ActionDock({ children }: { children: ReactNode }) {
  return (
    <footer className="bg-canvas px-5 py-3 lg:flex lg:justify-end lg:bg-transparent lg:px-8 lg:pb-10 lg:pt-2 lg:[&>*]:w-auto lg:[&>*]:min-w-56">
      {children}
    </footer>
  );
}
