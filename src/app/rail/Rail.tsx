import { useNavigate, useRouter } from '@/app/router';
import { useExam } from '@/core/exam/react';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import markUrl from '@/assets/brand/vera-mark.svg';
import { BookIcon, FileIcon, HomeIcon, ScanIcon } from '@/ui/icons';
import { cx } from '@/ui/cx';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { TINT_BG, TINT_INK } from '@/ui/tints';
import { RAIL_STEPS, railDone, railStepOf, railTint, type RailStepId } from './journeyRoutes';

const NAV = [
  { path: '/', key: 'navDesk', Icon: HomeIcon },
  { path: '/imagen', key: 'navInspect', Icon: ScanIcon },
  { path: '/revision', key: 'navReview', Icon: FileIcon },
  { path: '/guia', key: 'navGuide', Icon: BookIcon },
] as const;

const STEP_KEY: Record<RailStepId, string> = {
  contexto: 'stepContexto',
  imagen: 'stepImagen',
  analisis: 'stepAnalisis',
  resultado: 'stepResultado',
  observaciones: 'stepObservaciones',
  revision: 'stepRevision',
};

const STEP_PATH: Record<RailStepId, string> = {
  contexto: '/contexto',
  imagen: '/imagen',
  analisis: '/envio',
  resultado: '/resultado',
  observaciones: '/examen/abcde',
  revision: '/revision',
};

function activeNav(path: string): string {
  if (path === '/' || path === '/contexto') return '/';
  if (path.startsWith('/revision')) return '/revision';
  if (path.startsWith('/guia')) return '/guia';
  return '/imagen';
}

function useProgress() {
  const hasSite = useExam((s) => s.record.bodySite !== null);
  const hasImage = useExam((s) => s.image !== null);
  const hasResult = useExam((s) => s.result !== null);
  const hasObservation = useExam((s) => Object.keys(s.record.abcde).length > 0);
  const exported = useExam((s) => s.record.lastExport !== null);
  return { hasSite, hasImage, hasResult, hasObservation, exported };
}

/** Desktop navigation rail: brand, sections, the six-step exam journey and the language switch. Hidden below lg. */
export function Rail() {
  const t = useT('desk');
  const navigate = useNavigate();
  const { location } = useRouter();
  // A pending request is never left silently behind navigation (architecture section 5): no rail while waiting.
  const waiting = location.path.startsWith('/envio/procesando');
  const { locale, setLocale } = useI18n();
  const progress = useProgress();
  const currentNav = activeNav(location.path);
  const currentStep = railStepOf(location.path);
  if (waiting) return null;
  return (
    <aside
      aria-label={t('navLabel')}
      className="fixed inset-y-0 left-0 z-30 hidden w-66 flex-col gap-6 border-0 border-r border-solid border-soft-line bg-surface px-4 py-6 lg:flex"
    >
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-tile border-0 bg-transparent px-2 text-left text-ink outline-offset-2"
      >
        <img src={markUrl} alt="" width={36} height={36} className="size-9" />
        <span className="text-[26px] leading-none font-medium tracking-[-0.02em]">vera</span>
      </button>

      <nav aria-label={t('navLabel')} className="flex flex-col gap-1">
        {NAV.map(({ path, key, Icon }) => {
          const current = path === currentNav;
          return (
            <button
              key={path}
              type="button"
              aria-current={current ? 'page' : undefined}
              onClick={() => navigate(path)}
              className={cx(
                'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-tile border-0 px-3 text-left text-label outline-offset-2 transition-[background-color,color] duration-(--motion-press) ease-out',
                current ? 'bg-subtle text-ink' : 'bg-transparent text-muted enabled:fine-hover:bg-canvas enabled:fine-hover:text-ink',
              )}
            >
              <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center"><Icon /></span>
              {t(key)}
            </button>
          );
        })}
      </nav>

      <nav aria-label={t('stepperLabel')} className="flex flex-col gap-1">
        <p className="m-0 px-3 pb-1 text-caption font-medium uppercase tracking-wide text-muted">{t('railJourney')}</p>
        <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
          {RAIL_STEPS.map((step, index) => {
            const done = railDone(step, progress);
            const current = currentStep === step;
            const tint = railTint(step);
            return (
              <li key={step}>
                <button
                  type="button"
                  aria-current={current ? 'step' : undefined}
                  onClick={() => navigate(STEP_PATH[step])}
                  className={cx(
                    'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-tile border-0 px-3 text-left text-label outline-offset-2 transition-[background-color] duration-(--motion-press) ease-out',
                    current ? `${TINT_BG[tint]} ${TINT_INK[tint]}` : 'bg-transparent text-ink enabled:fine-hover:bg-canvas',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold',
                      done ? `${TINT_BG[tint]} ${TINT_INK[tint]}` : 'bg-canvas text-muted',
                    )}
                  >
                    {done ? '✓' : index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t(STEP_KEY[step])}</span>
                  {done ? <span className="sr-only">{t('railDone')}</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <SegmentedControl
          label={t('languageLabel')}
          value={locale}
          onValueChange={(value) => setLocale(value === 'en' ? 'en' : 'es')}
          options={[
            { value: 'es', label: 'ES' },
            { value: 'en', label: 'EN' },
          ]}
        />
        <p className="m-0 text-caption text-muted">{t('railNotice')}</p>
      </div>
    </aside>
  );
}
