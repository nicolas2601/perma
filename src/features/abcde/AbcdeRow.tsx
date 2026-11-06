import type { ReactNode } from 'react';
import { Chip, IconBlob, PHASE_TINT, cx } from '@/ui';
import { ChevronDownIcon } from '@/ui/icons';
import { AccordionBody } from '@/motion';

type AbcdeRowProps = {
  id: string;
  letter: string;
  title: string;
  /** Recorded value as a neutral chip, visible while the row is collapsed (e.g. "Sin evaluar"). */
  status: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/**
 * One ABCDE criterion as an accordion row on a raised card. The letter takes the observation
 * tint (identity only); the recorded value is a neutral chip. The body height animates through
 * AccordionBody, and a closed body is `inert` so its options cannot be reached by keyboard.
 */
export function AbcdeRow({ id, letter, title, status, open, onToggle, children }: AbcdeRowProps) {
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;
  return (
    <div id={id} className="shrink-0 overflow-hidden rounded-card bg-surface shadow-raised">
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="group grid min-h-15 w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-left outline-offset-2"
      >
        <IconBlob tint={PHASE_TINT.observaciones}>
          <span className="text-body-medium">{letter}</span>
        </IconBlob>
        <span className="grid min-w-0 gap-1.5">
          <span className="text-body-medium text-ink">{title}</span>
          <span className="justify-self-start">
            <Chip>{status}</Chip>
          </span>
        </span>
        <ChevronDownIcon
          className={cx('size-5 shrink-0 text-ink transition-transform duration-(--motion-expand) ease-out', open && 'rotate-180')}
        />
      </button>
      <AccordionBody open={open}>
        <div id={panelId} role="region" aria-labelledby={triggerId} inert={!open} className="px-4 pb-4">
          {children}
        </div>
      </AccordionBody>
    </div>
  );
}
