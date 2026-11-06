import type { ReactNode } from 'react';
import { cx } from './cx';
import { TINT_BG, TINT_INK, type TintOrNeutral } from './tints';

export type ChipProps = {
  tint?: TintOrNeutral;
  /** Toggle state. Setting it exposes aria-pressed on interactive chips. */
  selected?: boolean;
  /** Makes the chip a button with a 44 px minimum target. Omit for a static label. */
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

const STATIC_CLASSES = 'inline-flex items-center rounded-chip px-2.5 py-1 text-label font-medium';

const INTERACTIVE_CLASSES =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-chip border border-solid px-3 text-label font-medium cursor-pointer transition-transform duration-(--motion-press) ease-perma-out active:scale-[0.97] outline-offset-2 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled-surface disabled:text-disabled-text motion-reduce:active:scale-100';

/** Category or filter label. Tint is identity, never a status: pair it with text. */
export function Chip({ tint = 'neutral', selected, onClick, disabled = false, className, children }: ChipProps) {
  if (onClick === undefined) {
    return (
      <span data-tint={tint} className={cx(STATIC_CLASSES, TINT_BG[tint], TINT_INK[tint], className)}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      data-tint={tint}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        INTERACTIVE_CLASSES,
        disabled ? undefined : TINT_BG[tint],
        disabled ? undefined : TINT_INK[tint],
        selected ? 'border-current' : 'border-transparent',
        className,
      )}
    >
      {children}
    </button>
  );
}
