import { useEffect, useState } from 'react';
import { m } from 'motion/react';
import { Button, Chip, PHASE_TINT, cx } from '@/ui';
import { useNavigate, useSearch } from '@/app/router';
import { useExam, useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import type { AbcdeCriterion, ExamRecord } from '@/core/storage/types';
import { NavIndicator, usePressScale } from '@/motion';
import { ScreenHeader, ActionDock } from '@/features/inspect/Chrome';
import { useFlowSync } from '@/features/inspect/flowSync';
import { ImageFigure } from '@/features/inspect/ViewerPanels';
import { isReferenceImage, useObjectUrl } from '@/features/inspect/useImageSource';
import { CRITERIA, criterionValue, answeredCount } from './logic';
import { OptionGroup } from './OptionGroup';
import { AbcdeRow } from './AbcdeRow';
import { ReferenceCard } from './ReferenceCard';
import { parseCriterionParam, rowId } from './criterionParam';
import { CRITERION_DESC_KEY, CRITERION_TITLE_KEY } from './copy';

const NO_RESULT_REDIRECT = '/imagen';

export default function AbcdeScreen() {
  const t = useT('abcde');
  const tInspect = useT('inspect');
  const navigate = useNavigate();
  const search = useSearch();
  const record = useExam((state) => state.record);
  const result = useExam((state) => state.result);
  const image = useExam((state) => state.image);
  const src = useObjectUrl(image);
  const dispatch = useExamDispatch();
  useFlowSync('abcde');
  const initial = parseCriterionParam(search.get('criterio'));
  const [open, setOpen] = useState<AbcdeCriterion[]>(initial ? [initial] : []);
  const [active, setActive] = useState<AbcdeCriterion | null>(initial);

  useEffect(() => {
    if (!initial) return;
    document.getElementById(rowId(initial))?.scrollIntoView?.({ block: 'start' });
    // Deep link only: runs once for the criterion present on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Without a result there is nothing to annotate; the legal fallback is the image (G10).
  useEffect(() => {
    if (!result) navigate(NO_RESULT_REDIRECT, { replace: true });
  }, [result, navigate]);

  if (!result) return null;

  const toggle = (criterion: AbcdeCriterion) => {
    setOpen((prev) => (prev.includes(criterion) ? prev.filter((item) => item !== criterion) : [...prev, criterion]));
  };

  const jumpTo = (criterion: AbcdeCriterion) => {
    setOpen((prev) => (prev.includes(criterion) ? prev : [...prev, criterion]));
    setActive(criterion);
    navigate(`/examen/abcde?criterio=${criterion.toLowerCase()}`, { replace: true });
    document.getElementById(rowId(criterion))?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  };

  return (
    <main className="flex h-dvh flex-col bg-canvas lg:h-auto lg:min-h-dvh">
      <ScreenHeader
        title={`${t('pageTitle')} · ABCDE`}
        backTo="/inspeccion?tab=observaciones"
        backLabel={t('back')}
        infoLabel={tInspect('info')}
      />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 pb-5 pt-3 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-x-8 lg:gap-y-0 lg:overflow-visible lg:px-8 lg:pb-8">
        <div className="contents lg:sticky lg:top-6 lg:col-start-1 lg:flex lg:flex-col lg:gap-4 lg:self-start">
          <div className="hidden lg:block">
            <ImageFigure src={src} reference={isReferenceImage(image)} imageClassName="lg:h-[30dvh]" />
          </div>
          <div className="flex">
            <Chip tint={PHASE_TINT.observaciones}>{tInspect('stepObservations')}</Chip>
          </div>
          <p className="m-0 text-label text-muted">{t('intro')}</p>
          <nav aria-label={t('navLabel')} className="lg:hidden">
            <ul className="m-0 grid list-none grid-cols-5 gap-1.5 p-0 lg:grid-cols-1 lg:gap-2">
              {CRITERIA.map((criterion) => (
                <li key={criterion}>
                  <CriterionTab
                    criterion={criterion}
                    answered={criterionValue(record, criterion) !== null}
                    current={open.includes(criterion)}
                    active={active === criterion}
                    status={criterionStatus(record, criterion, t)}
                    onSelect={() => jumpTo(criterion)}
                  />
                </li>
              ))}
            </ul>
          </nav>
          <p className="m-0 text-label text-muted">
            {answeredCount(record)} / {CRITERIA.length}
          </p>
        </div>
        <div aria-label={t('listLabel')} role="group" className="flex flex-col gap-2 lg:col-start-2">
          {CRITERIA.map((criterion) => {
            const value = criterionValue(record, criterion);
            const title = t(CRITERION_TITLE_KEY[criterion]);
            return (
              <AbcdeRow
                key={criterion}
                id={rowId(criterion)}
                letter={criterion}
                title={title}
                status={criterionStatus(record, criterion, t)}
                open={open.includes(criterion)}
                onToggle={() => toggle(criterion)}
              >
                <p className="m-0 pb-2 text-label text-muted">{t(CRITERION_DESC_KEY[criterion])}</p>
                <OptionGroup
                  criterion={criterion}
                  name={title}
                  selected={value}
                  t={t}
                  onSelect={(next) => dispatch({ type: 'ABCDE_SET', criterion, value: next })}
                />
                <ReferenceCard criterion={criterion} />
              </AbcdeRow>
            );
          })}
        </div>
      </div>
      <ActionDock>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 lg:min-w-52" onClick={() => navigate('/inspeccion?tab=observaciones')}>
            {t('back')}
          </Button>
          <Button className="flex-1 lg:min-w-52" onClick={() => navigate('/examen/comparar')}>
            {t('next')}
          </Button>
        </div>
      </ActionDock>
    </main>
  );
}

/** Recorded value of one criterion as copy, or the "unanswered" label. */
function criterionStatus(record: ExamRecord, criterion: AbcdeCriterion, t: (key: string) => string): string {
  const value = criterionValue(record, criterion);
  return value === null ? t('unanswered') : t(`${criterion}.${value}`);
}

type CriterionTabProps = {
  criterion: AbcdeCriterion;
  answered: boolean;
  current: boolean;
  active: boolean;
  /** Shown beside the letter on desktop only: the progress chip carries the value per criterion. */
  status: string;
  onSelect: () => void;
};

/** Criterion shortcut in the strip. The active one carries the shared NavIndicator. */
function CriterionTab({ criterion, answered, current, active, status, onSelect }: CriterionTabProps) {
  const press = usePressScale(false);
  return (
    <m.button
      type="button"
      aria-current={current ? 'true' : undefined}
      onClick={onSelect}
      whileTap={press.whileTap}
      transition={press.transition}
      className={cx(
        'relative flex min-h-13 w-full flex-col items-center justify-center rounded-control border border-solid text-body-medium outline-offset-2 lg:min-h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2',
        answered ? 'border-accent bg-surface text-ink' : 'border-line bg-surface text-muted',
      )}
    >
      {active ? <NavIndicator activeId={criterion} /> : null}
      <span className="relative">{criterion}</span>
      <span className="hidden text-label font-normal text-ink lg:inline">{status}</span>
    </m.button>
  );
}
