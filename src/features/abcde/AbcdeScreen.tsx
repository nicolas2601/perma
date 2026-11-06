import { useEffect, useState } from 'react';
import { AccordionList, AccordionRow, Button, cx } from '@/ui';
import { useNavigate, useSearch } from '@/app/router';
import { ScreenHeader, ActionDock } from '@/features/inspect/Chrome';
import { copy as inspectCopy } from '@/features/inspect/copy';
import { useExam, useExamDispatch, useT } from './api';
import { CRITERIA, criterionValue, answeredCount } from './logic';
import { OptionGroup } from './OptionGroup';
import { accordionValue, parseCriterionParam, rowId } from './criterionParam';
import {
  copy,
  CRITERION_DESC_KEY,
  CRITERION_TITLE_KEY,
  optionKey,
} from './copy';
import type { AbcdeCriterion } from '@/core/storage/types';

export default function AbcdeScreen() {
  const t = useT(copy);
  const tInspect = useT(inspectCopy);
  const navigate = useNavigate();
  const search = useSearch();
  const { record, result } = useExam();
  const dispatch = useExamDispatch();
  const initial = parseCriterionParam(search.get('criterio'));
  const [open, setOpen] = useState<string[]>(initial ? [accordionValue(initial)] : []);

  useEffect(() => {
    if (!initial) return;
    document.getElementById(rowId(initial))?.scrollIntoView?.({ block: 'start' });
    // Deep link only: runs once for the criterion present on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Without a record there is nothing to annotate; the legal fallback is the image (G10).
  useEffect(() => {
    if (!result) navigate('/imagen', { replace: true });
  }, [result, navigate]);

  if (!result) return null;

  const jumpTo = (criterion: AbcdeCriterion) => {
    setOpen((prev) => (prev.includes(accordionValue(criterion)) ? prev : [...prev, accordionValue(criterion)]));
    navigate(`/examen/abcde?criterio=${criterion.toLowerCase()}`, { replace: true });
    document.getElementById(rowId(criterion))?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  };

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <ScreenHeader
        title={`${t('pageTitle')} · ABCDE`}
        backTo="/inspeccion?tab=observaciones"
        backLabel={t('back')}
        infoLabel={tInspect('info')}
      />
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <p className="m-0 text-label text-muted">{t('intro')}</p>
        <nav aria-label={t('navLabel')}>
          <ul className="m-0 grid list-none grid-cols-5 gap-1.5 p-0">
            {CRITERIA.map((criterion) => (
              <li key={criterion}>
                <button
                  type="button"
                  aria-current={open.includes(accordionValue(criterion)) ? 'true' : undefined}
                  onClick={() => jumpTo(criterion)}
                  className={cx(
                    'flex min-h-13 w-full flex-col items-center justify-center rounded-control border border-solid text-body-medium outline-offset-2',
                    criterionValue(record, criterion) === null ? 'border-line bg-surface text-muted' : 'border-accent bg-surface text-ink',
                  )}
                >
                  {criterion}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <p className="m-0 text-label text-muted">
          {answeredCount(record)} / {CRITERIA.length}
        </p>
        <AccordionList label={t('listLabel')} value={open} onValueChange={setOpen}>
          {CRITERIA.map((criterion) => {
            const value = criterionValue(record, criterion);
            const title = t(CRITERION_TITLE_KEY[criterion]);
            return (
              <div key={criterion} id={rowId(criterion)} className="flex flex-col gap-2">
                <AccordionRow
                  value={accordionValue(criterion)}
                  letter={criterion}
                  title={title}
                  status={value === null ? t('unanswered') : t(optionKey(criterion, value))}
                >
                  <p className="m-0 pb-2 text-label text-muted">{t(CRITERION_DESC_KEY[criterion])}</p>
                  <OptionGroup
                    criterion={criterion}
                    name={title}
                    selected={value}
                    t={t}
                    onSelect={(next) => dispatch({ type: 'ABCDE_SET', criterion, value: next })}
                  />
                </AccordionRow>
              </div>
            );
          })}
        </AccordionList>
      </div>
      <ActionDock>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => navigate('/inspeccion?tab=observaciones')}>
            {t('back')}
          </Button>
          <Button className="flex-1" onClick={() => navigate('/examen/comparar')}>
            {t('next')}
          </Button>
        </div>
      </ActionDock>
    </main>
  );
}
