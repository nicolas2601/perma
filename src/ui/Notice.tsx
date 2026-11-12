import type { ReactNode } from 'react';
import { InfoIcon } from './icons';

export type NoticeProps = {
  /** Accessible name of the note region. */
  label: string;
  children: ReactNode;
};

/** Permanent notice. It has no dismiss control by design. */
export function Notice({ label, children }: NoticeProps) {
  return (
    <section
      role="note"
      aria-label={label}
      className="flex gap-2 rounded-tile border border-solid border-line bg-subtle p-3 text-label text-ink"
    >
      <InfoIcon className="mt-0.5 size-5 shrink-0" />
      <p className="m-0">{children}</p>
    </section>
  );
}
