import { useState } from 'react';
import { useT } from '@/core/i18n/I18nProvider';
import type { AbcdeCriterion } from '@/core/storage/types';

type ReferenceCardCopy = { title: string; body: string };

/** Informative reference cards (Figma 141:3371 "Requisitos de referencia física", 141:3413 "Comparación con imagen anterior"). */
const REFERENCE_CARD_KEYS: Partial<Record<AbcdeCriterion, ReferenceCardCopy>> = {
  D: { title: 'refPhysicalTitle', body: 'refPhysicalBody' },
  E: { title: 'refChangeTitle', body: 'refChangeBody' },
};

type ReferenceCardProps = { criterion: AbcdeCriterion };

/** Collapsed-by-default information card placed inside its criterion. Never records an answer. */
export function ReferenceCard({ criterion }: ReferenceCardProps) {
  const t = useT('abcde');
  const [expanded, setExpanded] = useState(false);
  const keys = REFERENCE_CARD_KEYS[criterion];
  if (!keys) return null;
  return (
    <div className="flex flex-col rounded-tile border border-solid border-line bg-surface p-4">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full flex-col gap-0.5 text-left outline-offset-2"
      >
        <span className="text-body-medium text-ink">{t(keys.title)}</span>
        <span className="text-label text-muted">{t('refCardHint')}</span>
      </button>
      {expanded ? <p className="m-0 pt-2 text-label text-muted">{t(keys.body)}</p> : null}
    </div>
  );
}
