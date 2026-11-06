import type { ReactNode } from 'react';
import { cx } from './cx';

export type BadgeTone = 'neutral' | 'simulated';

export type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-subtle text-muted',
  simulated: 'border border-solid border-line bg-subtle text-ink',
};

/** Status label. Meaning is carried by the text, never by hue alone. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cx('inline-flex items-center rounded-chip px-2 py-1 text-caption font-medium', TONE_CLASSES[tone])}
    >
      {children}
    </span>
  );
}
