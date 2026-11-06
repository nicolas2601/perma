import type { ReactNode } from 'react';
import { cx } from './cx';

export type CardTone = 'surface' | 'subtle' | 'ink';

export type CardProps = {
  tone?: CardTone;
  as?: 'div' | 'section' | 'article';
  className?: string;
  children: ReactNode;
};

const TONE_CLASSES: Record<CardTone, string> = {
  surface: 'bg-surface text-ink',
  subtle: 'border-[1.25px] border-solid border-surface bg-subtle text-ink',
  ink: 'bg-ink text-on-accent',
};

/** Bento tile. Radius 14 px and 12 px padding follow Figma "Clinical / Entry bento". */
export function Card({ tone = 'surface', as: Tag = 'div', className, children }: CardProps) {
  return (
    <Tag data-tone={tone} className={cx('flex flex-col gap-2 overflow-hidden rounded-tile p-3', TONE_CLASSES[tone], className)}>
      {children}
    </Tag>
  );
}
