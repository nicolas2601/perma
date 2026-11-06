import { motion, type HTMLMotionProps } from 'motion/react';
import type { ReactNode } from 'react';
import { cx } from './cx';
import { usePressMotion } from './motion';

export type IconButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  /** Accessible name; required because the icon carries no text. */
  label: string;
  icon: ReactNode;
  tone?: 'surface' | 'subtle';
  pressed?: boolean;
};

const BASE =
  'inline-flex size-12 shrink-0 items-center justify-center rounded-control border border-solid outline-offset-2 text-ink transition-[transform,background-color,opacity] duration-(--motion-press) ease-out disabled:cursor-not-allowed disabled:border-soft-line disabled:bg-disabled-surface disabled:text-disabled-text';

const TONE_CLASSES = {
  surface: 'border-line bg-surface enabled:fine-hover:bg-subtle enabled:active:bg-subtle data-[pressed]:bg-subtle',
  subtle: 'border-transparent bg-subtle enabled:fine-hover:bg-line/30 enabled:active:bg-line/30 data-[pressed]:bg-line/30',
} as const;

/** Icon-only action. 48 px visual size (Figma "Clinical / Button / Tool"), never below the 44 px target. */
export function IconButton({
  label,
  icon,
  tone = 'surface',
  pressed = false,
  disabled = false,
  type = 'button',
  onClick,
  className,
  ...rest
}: IconButtonProps) {
  const press = usePressMotion(disabled);
  return (
    <motion.button
      {...rest}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled}
      data-tone={tone}
      data-pressed={pressed || undefined}
      onClick={disabled ? undefined : onClick}
      whileTap={press.whileTap}
      transition={press.transition}
      className={cx(BASE, TONE_CLASSES[tone], className)}
    >
      {icon}
    </motion.button>
  );
}
