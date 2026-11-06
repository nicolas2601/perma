import { useRef, useState } from 'react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useNavigate } from '@/app/router';
import { hasRecordContent } from '@/core/exam/content';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { IconBlob } from '@/ui/IconBlob';
import { IconButton } from '@/ui/IconButton';
import { BookIcon, ScanIcon } from '@/ui/icons';
import geometricArt from '@/assets/brand/perma-geometric-welcome.svg';
import referenceAvif from '@/assets/images/reference-tschandl-300.avif';
import referenceWebp from '@/assets/images/reference-tschandl-300.webp';
import moreIcon from '@/assets/icons/more.svg';
import { AppShell } from './AppShell';
import { DiscardSheet, OptionsSheet, ScopeSheet } from './HomeSheets';
import { HomeJourney } from './HomeJourney';
import { CONTEXT_PATH, GALLERY_PATH, GUIDE_PATH } from './recoveryPaths';

const ENTRY_STAGGER_S = 0.08;
const ENTRY_OFFSET_PX = 12;
const ENTRY_DURATION_S = 0.22;
const REDUCED_DURATION_S = 0.1;

/** The one Home entry sequence: opacity and 12 px transform, stagger 80 ms. */
function entryVariants(reduce: boolean): Variants {
  if (reduce) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: REDUCED_DURATION_S } },
    };
  }
  return {
    hidden: {},
    show: { transition: { staggerChildren: ENTRY_STAGGER_S } },
  };
}

function entryItem(reduce: boolean): Variants {
  if (reduce) return { hidden: { opacity: 0 }, show: { opacity: 1 } };
  return {
    hidden: { opacity: 0, y: ENTRY_OFFSET_PX },
    show: { opacity: 1, y: 0, transition: { duration: ENTRY_DURATION_S, ease: [0.23, 1, 0.32, 1] } },
  };
}

function ReferenceCard() {
  const t = useT('desk');
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(GALLERY_PATH)}
      className="flex w-full cursor-pointer gap-3 rounded-card border border-solid border-soft-line bg-surface p-3 text-left text-ink shadow-raised outline-offset-2 active:scale-[0.98] motion-reduce:active:scale-100 transition-transform duration-(--motion-card) ease-perma-out lg:gap-8 lg:p-5"
    >
      <span className="flex w-28 shrink-0 flex-col gap-1 lg:w-56">
        <picture>
          <source srcSet={referenceAvif} type="image/avif" />
          <img
            src={referenceWebp}
            width={112}
            height={83}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-auto w-full rounded-chip object-contain"
          />
        </picture>
        <span className="text-caption text-muted">{t('referenceAuthor')}</span>
        <span className="whitespace-nowrap text-caption text-muted">{t('referenceLicense')}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2 lg:justify-center lg:gap-3">
        <span className="text-section text-ink">{t('referenceTitle')}</span>
        <span className="text-label text-muted">{t('referenceExplore')}</span>
        <span className="text-label text-muted">{t('referenceNote')}</span>
      </span>
    </button>
  );
}

export default function Home() {
  const t = useT('desk');
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
  const hasContent = useExam((s) => hasRecordContent(s));
  const dispatch = useExamDispatch();
  const [scopeOpen, setScopeOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [continueToContext, setContinueToContext] = useState(false);
  // The trigger is the element that receives focus back when a menu-opened sheet closes.
  // Focus moves to it only after the options sheet has closed: while that modal is open its
  // focus trap pulls focus back, so the child sheet would capture the wrong element.
  const menuTriggerRef = useRef<HTMLElement | null>(null);
  const openFromMenu = (open: () => void) => {
    setMenuOpen(false);
    requestAnimationFrame(() => {
      menuTriggerRef.current?.focus();
      open();
    });
  };
  const openNewExam = () => {
    if (!hasContent) {
      navigate(CONTEXT_PATH);
      return;
    }
    setContinueToContext(true);
    setDiscardOpen(true);
  };
  return (
    <AppShell
      title={t('brand')}
      headerAction={
        <IconButton
          label={t('menuAction')}
          onClick={(event) => {
            menuTriggerRef.current = event.currentTarget;
            event.currentTarget.focus();
            setMenuOpen(true);
          }}
          icon={<img src={moreIcon} alt="" className="size-5" />}
        />
      }
    >
      <m.div variants={entryVariants(reduce)} initial="hidden" animate="show" className="flex flex-col gap-5 lg:gap-10">
        <m.div variants={entryItem(reduce)} className="flex items-center gap-3 lg:justify-between lg:gap-10 lg:rounded-[28px] lg:bg-tint-mint lg:p-10">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <h1 className="m-0 min-w-0 max-w-36 text-title text-ink lg:max-w-md lg:text-[48px] lg:leading-[54px]">{t('headline')}</h1>
            <p className="m-0 hidden max-w-md text-body text-ink/80 lg:block">{t('homeLead')}</p>
            <div className="hidden lg:block">
              <Button className="lg:px-10" onClick={openNewExam}>
                {t('newExam')}
              </Button>
            </div>
          </div>
          <img src={geometricArt} alt="" width={160} height={150} className="h-auto w-40 shrink-0 lg:w-72" />
        </m.div>
        <m.div variants={entryItem(reduce)} className="grid h-[270px] grid-cols-[1fr_auto] gap-3 lg:h-auto lg:grid-cols-[1.7fr_1fr] lg:gap-6">
          <Card variant="raised" className="gap-3 p-4 lg:gap-4 lg:p-8">
            <IconBlob tint="mint" size={48}>
              <ScanIcon />
            </IconBlob>
            <h2 className="m-0 text-section text-ink">{t('prepareTitle')}</h2>
            <p className="m-0 text-label text-muted">{t('prepareBody')}</p>
            <Button fullWidth className="min-h-14 lg:hidden" onClick={openNewExam}>
              {t('newExam')}
            </Button>
          </Card>
          <button
            type="button"
            onClick={() => setScopeOpen(true)}
            className="grid w-32 cursor-pointer content-start gap-2 lg:w-auto lg:gap-3 lg:p-6 rounded-card bg-tint-sky p-3 text-left text-ink outline-offset-2 active:scale-[0.98] motion-reduce:active:scale-100 transition-transform duration-(--motion-card) ease-perma-out"
          >
            <IconBlob tint="sky" tone="surface">
              <BookIcon />
            </IconBlob>
            <span className="text-section text-ink">{t('protocolTitle')}</span>
            <span className="text-label text-muted">{t('protocolScope')}</span>
            <span className="text-label text-ink">{t('protocolStatus')}</span>
          </button>
        </m.div>
        <m.div variants={entryItem(reduce)}>
          <ReferenceCard />
        </m.div>
      </m.div>
      <HomeJourney />
      <OptionsSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        hasContent={hasContent}
        onScope={() => openFromMenu(() => setScopeOpen(true))}
        onGuide={() => {
          setMenuOpen(false);
          navigate(GUIDE_PATH);
        }}
        onDelete={() =>
          openFromMenu(() => {
            setContinueToContext(false);
            setDiscardOpen(true);
          })
        }
      />
      <ScopeSheet open={scopeOpen} onOpenChange={setScopeOpen} />
      <DiscardSheet
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => {
          dispatch({ type: 'DISCARD_RECORD' });
          setDiscardOpen(false);
          if (continueToContext) navigate(CONTEXT_PATH);
        }}
      />
    </AppShell>
  );
}
