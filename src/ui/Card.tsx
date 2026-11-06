import type { ReactNode } from 'react';
import { cx } from './cx';
import { TINT_BG, type TintOrNeutral } from './tints';

export type CardTone = 'surface' | 'subtle' | 'ink';
/** outline: soft-line 1 px border. soft: tint background, no border. raised: white with a layered soft shadow. */
export type CardVariant = 'outline' | 'soft' | 'raised';

export type CardProps = {
  /** Legacy surface tone. Ignored when `variant` is set. */
  tone?: CardTone;
  variant?: CardVariant;
  /** Background for `soft` cards. Defaults to the neutral subtle surface. */
  tint?: TintOrNeutral;
  /** Adds the press feedback (scale .98, 140 ms, transform only) and hover shadow on fine pointers. */
  interactive?: boolean;
  as?: 'div' | 'section' | 'article' | 'button';
  className?: string;
  children: ReactNode;
};

const TONE_CLASSES: Record<CardTone, string> = {
  surface: 'bg-surface text-ink',
  subtle: 'border-[1.25px] border-solid border-surface bg-subtle text-ink',
  ink: 'bg-ink text-on-accent',
};

const VARIANT_CLASSES: Record<CardVariant, string> = {
  outline: 'border border-solid border-soft-line bg-surface text-ink',
  soft: 'text-ink',
  raised: 'bg-surface text-ink shadow-raised',
};

const INTERACTIVE_CLASSES =
  'cursor-pointer transition-transform duration-(--motion-card) ease-perma-out active:scale-[0.98] fine-hover:shadow-raised motion-reduce:transition-opacity motion-reduce:active:scale-100 motion-reduce:active:opacity-90';

function surfaceClasses(variant: CardVariant | undefined, tone: CardTone, tint: TintOrNeutral): string {
  if (!variant) return cx('rounded-tile p-3', TONE_CLASSES[tone]);
  const background = variant === 'soft' ? TINT_BG[tint] : undefined;
  return cx('rounded-card p-4', VARIANT_CLASSES[variant], background);
}

/** Bento tile. Legacy tone keeps radius 14 px and padding 12 px (Figma "Clinical / Entry bento"). */
export function Card({ tone = 'surface', variant, tint = 'neutral', interactive = false, as: Tag = 'div', className, children }: CardProps) {
  return (
    <Tag
      data-tone={variant ? undefined : tone}
      data-variant={variant}
      data-tint={variant === 'soft' ? tint : undefined}
      type={Tag === 'button' ? 'button' : undefined}
      className={cx(
        'flex flex-col gap-2 overflow-hidden',
        surfaceClasses(variant, tone, tint),
        interactive && INTERACTIVE_CLASSES,
        className,
      )}
    >
      {children}
    </Tag>
  );
}
