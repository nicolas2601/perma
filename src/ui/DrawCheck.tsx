import { cx } from './cx';

export type DrawCheckProps = {
  /** Confirms an outcome (for example an export). Omit it for a decorative check. */
  label?: string;
  size?: number;
  className?: string;
};

const DEFAULT_SIZE = 24;
const STROKE_WIDTH = 2.25;

/**
 * Check mark that draws on once (320 ms, transform-free stroke-dashoffset) and then stays static.
 * The draw runs only under motion-safe; reduced motion shows the finished check immediately.
 */
export function DrawCheck({ label, size = DEFAULT_SIZE, className }: DrawCheckProps) {
  const accessibility = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      {...accessibility}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('text-deep-mint motion-safe:animate-(--animate-perma-draw-check)', className)}
    >
      <path d="M5 12.5 9.5 17 19 7" pathLength={1} strokeDasharray="1 1" />
    </svg>
  );
}
