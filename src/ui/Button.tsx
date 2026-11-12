import { m, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { cx } from './cx';
import { usePressMotion } from './motion';
import { TINT_BG, TINT_INK, type Tint } from './tints';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'soft';

export type ButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Only used by the `soft` variant. */
  tint?: Tint;
  /** Pending action: keeps the label, sets aria-busy and blocks repeat activation. */
  loading?: boolean;
  /** Forces the pressed appearance, for specimens and visual tests. */
  pressed?: boolean;
  fullWidth?: boolean;
};

const BASE =
  'relative inline-flex min-h-13 min-w-11 items-center justify-center gap-1.5 rounded-control border border-solid px-3 py-2 text-label select-none outline-offset-2 transition-[transform,background-color,opacity] duration-(--motion-press) ease-out disabled:cursor-not-allowed disabled:border-soft-line disabled:bg-disabled-surface disabled:text-disabled-text';

/** Primary stays flat teal: depth comes from a 1 px top highlight and an inset pressed shadow only. */
const VARIANT_CLASSES: Record<Exclude<ButtonVariant, 'soft'>, string> = {
  primary:
    'border-accent bg-accent text-on-accent shadow-key enabled:fine-hover:bg-accent-pressed enabled:active:bg-accent-pressed enabled:active:shadow-key-pressed data-[pressed]:bg-accent-pressed data-[pressed]:shadow-key-pressed',
  secondary:
    'border-line bg-surface text-ink enabled:fine-hover:bg-subtle enabled:active:bg-subtle data-[pressed]:bg-subtle',
  quiet:
    'border-transparent bg-transparent text-ink enabled:fine-hover:bg-subtle enabled:active:bg-subtle data-[pressed]:bg-subtle',
  danger:
    'border-error bg-error text-on-accent enabled:fine-hover:opacity-90 enabled:active:opacity-90 data-[pressed]:opacity-90',
};

const SOFT_CLASSES = 'border-transparent enabled:fine-hover:opacity-90 enabled:active:opacity-90 data-[pressed]:opacity-90';

function variantClasses(variant: ButtonVariant, tint: Tint): string {
  if (variant !== 'soft') return VARIANT_CLASSES[variant];
  return `${TINT_BG[tint]} ${TINT_INK[tint]} ${SOFT_CLASSES}`;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
    />
  );
}

export function Button({
  variant = 'primary',
  tint = 'sky',
  loading = false,
  pressed = false,
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const inert = disabled || loading;
  const press = usePressMotion(inert);
  return (
    <m.button
      {...rest}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading && !disabled ? true : undefined}
      data-variant={variant}
      data-loading={loading || undefined}
      data-pressed={pressed || undefined}
      onClick={inert ? undefined : onClick}
      whileTap={press.whileTap}
      transition={press.transition}
      className={cx(BASE, variantClasses(variant, tint), fullWidth && 'w-full', className)}
    >
      {loading ? <Spinner /> : null}
      <span>{children}</span>
    </m.button>
  );
}
