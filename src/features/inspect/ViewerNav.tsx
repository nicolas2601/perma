import { useNavigate } from '@/app/router';
import { useT } from '@/core/i18n/I18nProvider';
import { CAPTURE_PATH, DESK_PATH, GUIDE_PATH, REVIEW_PATH } from '@/features/desk/recoveryPaths';
import { FloatingNav, type NavItem } from '@/ui/FloatingNav';
import { BookIcon, FileIcon, HomeIcon, ScanIcon } from '@/ui/icons';

const ICON_CLASS = 'size-5';

/** Floating glass nav of the viewer; "Examinar" is the current section (Figma 141:3102). */
export function ViewerNav() {
  const t = useT('desk');
  const navigate = useNavigate();
  const items: NavItem[] = [
    { id: DESK_PATH, label: t('navDesk'), icon: <HomeIcon className={ICON_CLASS} /> },
    { id: CAPTURE_PATH, label: t('navInspect'), icon: <ScanIcon className={ICON_CLASS} /> },
    { id: REVIEW_PATH, label: t('navReview'), icon: <FileIcon className={ICON_CLASS} /> },
    { id: GUIDE_PATH, label: t('navGuide'), icon: <BookIcon className={ICON_CLASS} /> },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] lg:hidden">
      <FloatingNav label={t('navLabel')} items={items} currentId={CAPTURE_PATH} onNavigate={(id) => navigate(id)} />
    </nav>
  );
}
