import type { ReactNode } from 'react';
import { cx } from '@/ui';
import { ChevronDownIcon } from '@/ui/icons';
import { AccordionBody } from '@/motion';

type AbcdeRowProps = {
  id: string;
  letter: string;
  title: string;
  /** Recorded status, visible while the row is collapsed (e.g. "Sin evaluar"). */
  status: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/**
 * One ABCDE criterion as an accordion row. The body height animates through AccordionBody,
 * and a closed body is `inert` so its options cannot be reached by keyboard.
 */
export function AbcdeRow({ id, letter, title, status, open, onToggle, children }: AbcdeRowProps) {
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;
  return (
    <div id={id} className="overflow-hidden rounded-nav border border-solid border-line bg-surface">
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="group flex min-h-15 w-full items-center gap-2.5 px-3 text-left outline-offset-2"
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-chip bg-subtle text-body-medium text-accent"
        >
          {letter}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body-medium text-ink">{title}</span>
          <span className="text-label text-muted">{status}</span>
        </span>
        <ChevronDownIcon
          className={cx('size-5 shrink-0 text-ink transition-transform duration-(--motion-expand) ease-out', open && 'rotate-180')}
        />
      </button>
      <AccordionBody open={open}>
        <div id={panelId} role="region" aria-labelledby={triggerId} inert={!open} className="px-3 pb-3">
          {children}
        </div>
      </AccordionBody>
    </div>
  );
}
