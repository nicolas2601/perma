import type { ReactNode } from 'react';
import { cx } from '@/ui/cx';

/**
 * Sizes an icon from the shared UI kit. The kit icons fill their parent (`size-full`),
 * so the size must come from this wrapper, not from a className on the icon itself.
 */
export function Glyph({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span aria-hidden="true" className={cx('inline-flex shrink-0 items-center justify-center', className)}>
      {children}
    </span>
  );
}
