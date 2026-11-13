import { useRef, useState } from 'react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useNavigate } from '@/app/router';
import { hasRecordContent } from '@/core/exam/content';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { IconButton } from '@/ui/IconButton';
import prepareArt from '@/assets/art/card-prepare.svg';
import referenceArt from '@/assets/art/card-reference.svg';
import scopeArt from '@/assets/art/card-scope.svg';
import moreIcon from '@/assets/icons/more.svg';
import { AppShell } from './AppShell';
import { HomeHero } from './HomeHero';
import { DiscardSheet, OptionsSheet, ScopeSheet } from './HomeSheets';
import { ToolCard } from './ToolCard';
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
      <m.div variants={entryVariants(reduce)} initial="hidden" animate="show" className="flex flex-col gap-5 lg:gap-9">
        <m.div variants={entryItem(reduce)}>
          <HomeHero onNewExam={openNewExam} onReference={() => navigate(GALLERY_PATH)} />
        </m.div>
        <m.section variants={entryItem(reduce)} aria-labelledby="home-tools-title" className="flex flex-col gap-4">
          <h2 id="home-tools-title" className="m-0 text-[19px] leading-6 font-medium tracking-[-0.005em] text-ink">
            {t('toolsTitle')}
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <ToolCard title={t('prepareTitle')} body={t('prepareBody')} link={t('newExam')} art={prepareArt} onSelect={openNewExam} />
            <ToolCard
              title={t('referenceTitle')}
              body={t('toolReferenceBody')}
              link={t('toolReferenceLink')}
              art={referenceArt}
              tone="bruma"
              layout="artTop"
              caption={t('toolTextureCaption')}
              onSelect={() => navigate(GALLERY_PATH)}
            />
            <ToolCard
              title={t('toolScopeTitle')}
              body={t('toolScopeBody')}
              link={t('toolScopeLink')}
              art={scopeArt}
              tone="crema"
              onSelect={() => setScopeOpen(true)}
            />
          </div>
        </m.section>
      </m.div>
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
