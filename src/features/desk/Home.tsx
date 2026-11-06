import { useState } from 'react';
import { m, useReducedMotion, type Variants } from 'motion/react';
import { useNavigate } from '@/app/router';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { IconButton } from '@/ui/IconButton';
import { BookIcon } from '@/ui/icons';
import { Glyph } from './Glyph';
import geometricArt from '@/assets/brand/perma-geometric-welcome.svg';
import referenceAvif from '@/assets/images/reference-tschandl-300.avif';
import referenceWebp from '@/assets/images/reference-tschandl-300.webp';
import moreIcon from '@/assets/icons/more.svg';
import { AppShell } from './AppShell';
import { DiscardSheet, ScopeSheet } from './HomeSheets';
import { CONTEXT_PATH, GALLERY_PATH } from './recoveryPaths';

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
      className="flex w-full cursor-pointer gap-3 rounded-tile border border-solid border-surface bg-surface p-3 text-left text-ink outline-offset-2"
    >
      <span className="flex w-28 shrink-0 flex-col gap-1">
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
        <span className="text-caption text-muted">{t('referenceCredit')}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-body text-ink">{t('referenceTitle')}</span>
        <span className="text-caption text-muted">{t('referenceExplore')}</span>
        <span className="text-caption text-muted">{t('referenceNote')}</span>
      </span>
    </button>
  );
}

export default function Home() {
  const t = useT('desk');
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
  const hasRecord = useExam((s) => s.phase !== 'idle' || s.image !== null);
  const dispatch = useExamDispatch();
  const [scopeOpen, setScopeOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  return (
    <AppShell
      title={t('brand')}
      headerAction={
        <IconButton
          label={t('discardAction')}
          disabled={!hasRecord}
          onClick={() => setDiscardOpen(true)}
          icon={<img src={moreIcon} alt="" className="size-5" />}
        />
      }
    >
      <m.div variants={entryVariants(reduce)} initial="hidden" animate="show" className="flex flex-col gap-5">
        <m.div variants={entryItem(reduce)} className="flex items-center gap-3">
          <h1 className="m-0 min-w-0 flex-1 text-title text-ink">{t('headline')}</h1>
          <img src={geometricArt} alt="" width={168} height={152} className="h-auto w-32 shrink-0" />
        </m.div>
        <m.div variants={entryItem(reduce)} className="grid h-[270px] grid-cols-[1fr_auto] gap-3">
          <Card tone="surface" className="gap-3 p-4">
            <h2 className="m-0 text-section text-ink">{t('prepareTitle')}</h2>
            <p className="m-0 text-label text-muted">{t('prepareBody')}</p>
            <Button fullWidth onClick={() => navigate(CONTEXT_PATH)}>
              {t('newExam')}
            </Button>
          </Card>
          <button
            type="button"
            onClick={() => setScopeOpen(true)}
            className="flex w-32 cursor-pointer flex-col gap-2 rounded-tile border border-solid border-surface bg-subtle p-3 text-left text-ink outline-offset-2"
          >
            <Glyph className="size-5"><BookIcon /></Glyph>
            <span className="text-body text-ink">{t('protocolTitle')}</span>
            <span className="text-caption text-muted">{t('protocolScope')}</span>
            <span className="text-label text-ink">{t('protocolStatus')}</span>
          </button>
        </m.div>
        <m.div variants={entryItem(reduce)}>
          <ReferenceCard />
        </m.div>
      </m.div>
      <ScopeSheet open={scopeOpen} onOpenChange={setScopeOpen} />
      <DiscardSheet
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => {
          dispatch({ type: 'DISCARD_RECORD' });
          setDiscardOpen(false);
        }}
      />
    </AppShell>
  );
}
