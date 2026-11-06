import { Button, IconButton } from '@/ui';
import { CloseIcon } from '@/ui/icons';
import { Link, useNavigate } from '@/app/router';
import { useT } from '@/core/i18n/I18nProvider';
import { ActionDock, LanguageSwitch } from '@/features/inspect/Chrome';

const CHECKLIST = [
  { title: 'readyLengthTitle', body: 'readyLengthBody' },
  { title: 'readyPlaneTitle', body: 'readyPlaneBody' },
  { title: 'readyConfirmTitle', body: 'readyConfirmBody' },
] as const;

/** Reference checklist (Figma 141:3480). Documentation only: it never converts units. */
export default function CalibrationReadyScreen() {
  const t = useT('abcde');
  const tInspect = useT('inspect');
  const navigate = useNavigate();
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <header className="flex h-15 items-center gap-2 bg-surface px-5">
        <IconButton label={tInspect('close')} icon={<CloseIcon className="size-6" />} onClick={() => navigate('/examen/abcde')} />
        <h1 className="m-0 min-w-0 flex-1 text-header font-medium text-ink">{t('readyTitle')}</h1>
        <Link
          to="/guia"
          aria-label={tInspect('info')}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-control border border-solid border-line bg-surface text-section text-muted outline-offset-2"
        >
          <span aria-hidden="true">i</span>
        </Link>
        <LanguageSwitch />
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('readyHeading')}</h2>
        <p className="m-0 text-body text-ink">{t('readyIntro')}</p>
        {CHECKLIST.map((item) => (
          <section key={item.title} className="flex flex-col gap-1.5">
            <h3 className="m-0 text-section text-ink">{t(item.title)}</h3>
            <p className="m-0 text-body text-muted">{t(item.body)}</p>
          </section>
        ))}
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/examen/abcde')}>
          {t('readyAction')}
        </Button>
      </ActionDock>
    </main>
  );
}
