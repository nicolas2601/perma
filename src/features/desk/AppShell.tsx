import type { ReactNode } from 'react';
import { useNavigate, useRouter } from '@/app/router';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import markUrl from '@/assets/brand/perma-mark.svg';
import { BookIcon, ChevronDownIcon, FileIcon, HomeIcon, ScanIcon } from '@/ui/icons';
import { FloatingNav, type NavItem } from '@/ui/FloatingNav';
import { IconButton } from '@/ui/IconButton';
import { cx } from '@/ui/cx';
import { Glyph } from './Glyph';
import { CAPTURE_PATH, DESK_PATH, GUIDE_PATH, REVIEW_PATH } from './recoveryPaths';

/** Rendered size of the brand mark in the top bar (CSS size-8 = 32 px); kept in sync with the class below. */
const BRAND_MARK_PX = 32;

export interface AppShellProps {
  title: string;
  onBack?: () => void;
  /** Optional top-bar action placed before the guide button (e.g. workspace options). */
  headerAction?: ReactNode;
  /** Hidden during processing so a pending request is never left silently (architecture section 5). */
  showNav?: boolean;
  children: ReactNode;
}

/** Maps the current path to the nav entry it belongs to. */
export function activeNavId(path: string): string | undefined {
  if (path === DESK_PATH || path === '/contexto') return DESK_PATH;
  if (path.startsWith(CAPTURE_PATH) || path.startsWith('/envio')) return CAPTURE_PATH;
  if (path.startsWith(REVIEW_PATH)) return REVIEW_PATH;
  if (path.startsWith(GUIDE_PATH)) return GUIDE_PATH;
  return undefined;
}

function useNavItems(): NavItem[] {
  const t = useT('desk');
  return [
    { id: DESK_PATH, label: t('navDesk'), icon: <Glyph className="size-5"><HomeIcon /></Glyph> },
    { id: CAPTURE_PATH, label: t('navInspect'), icon: <Glyph className="size-5"><ScanIcon /></Glyph> },
    { id: REVIEW_PATH, label: t('navReview'), icon: <Glyph className="size-5"><FileIcon /></Glyph> },
    { id: GUIDE_PATH, label: t('navGuide'), icon: <Glyph className="size-5"><BookIcon /></Glyph> },
  ];
}

function LanguageSwitch() {
  const t = useT('desk');
  const { locale, setLocale } = useI18n();
  const target = locale === 'es' ? 'en' : 'es';
  return (
    <button
      type="button"
      lang={target}
      aria-label={`${t('languageLabel')}: ${t('languageSwitch')}`}
      onClick={() => setLocale(target)}
      className="min-h-12 min-w-12 rounded-control border border-solid border-line bg-surface px-3 text-header font-medium text-ink outline-offset-2"
    >
      {t('languageSwitch')}
    </button>
  );
}

/** Shared page frame: top bar with back, title, guide and language; floating glass nav. */
export function AppShell({ title, onBack, headerAction, showNav = true, children }: AppShellProps) {
  const t = useT('desk');
  const navigate = useNavigate();
  const { location } = useRouter();
  const navItems = useNavItems();
  const navId = activeNavId(location.path);
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 bg-canvas px-5 pt-[env(safe-area-inset-top)] pb-3">
        {onBack ? (
          <IconButton
            label={t('back')}
            onClick={onBack}
            icon={<Glyph className="size-5 rotate-90"><ChevronDownIcon /></Glyph>}
          />
        ) : (
          <img src={markUrl} alt="PERMA" width={BRAND_MARK_PX} height={BRAND_MARK_PX} decoding="async" className="m-2 size-8 shrink-0" />
        )}
        <p className="m-0 min-w-0 flex-1 text-header text-muted">{title}</p>
        {headerAction}
        <LanguageSwitch />
      </header>
      <main className={cx('flex flex-1 flex-col gap-5 px-5', showNav ? 'pb-28' : 'pb-8')}>{children}</main>
      {showNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 px-5 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <FloatingNav label={t('navLabel')} items={navItems} currentId={navId ?? ''} onNavigate={(id) => navigate(id)} />
        </nav>
      ) : null}
    </div>
  );
}
