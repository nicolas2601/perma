import * as AccordionPrimitive from '@radix-ui/react-accordion';
import type { ReactNode } from 'react';
import { ChevronDownIcon } from './icons';

export type AccordionListProps = Omit<AccordionPrimitive.AccordionMultipleProps, 'type' | 'children'> & {
  /** Accessible name of the list, e.g. the ABCDE sheet heading. */
  label: string;
  children: ReactNode;
};

/** One accordion sheet: several criteria may stay open; values remain visible when collapsed. */
export function AccordionList({ label, children, ...props }: AccordionListProps) {
  return (
    <AccordionPrimitive.Root type="multiple" aria-label={label} className="flex flex-col gap-2" {...props}>
      {children}
    </AccordionPrimitive.Root>
  );
}

export type AccordionRowProps = {
  value: string;
  /** Single-letter criterion marker, e.g. "A". */
  letter: string;
  title: string;
  /** Current recorded status, visible while collapsed, e.g. "Sin evaluar". */
  status: string;
  children: ReactNode;
};

export function AccordionRow({ value, letter, title, status, children }: AccordionRowProps) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className="overflow-hidden rounded-nav border border-solid border-line bg-surface"
    >
      <AccordionPrimitive.Header className="m-0">
        <AccordionPrimitive.Trigger className="group flex min-h-15 w-full items-center gap-2.5 px-3 text-left outline-offset-2">
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
          <ChevronDownIcon className="size-5 shrink-0 text-ink transition-transform duration-(--motion-expand) ease-out group-data-[state=open]:rotate-180" />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-perma-accordion-up data-[state=open]:animate-perma-accordion-down">
        <div className="px-3 pb-3">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}
