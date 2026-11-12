import type { ReactNode } from 'react';
import { cx } from './cx';
import { TINT_BG, TINT_INK, type Tint } from './tints';

export type IconBlobSize = 40 | 48;

export type IconBlobProps = {
  tint: Tint;
  /** `tint` fills with the tint; `surface` is for use on an already tinted card, so the blob stays visible. */
  tone?: 'tint' | 'surface';
  size?: IconBlobSize;
  /** Gives the blob a meaning. Without it the blob is decorative and hidden from assistive tech. */
  label?: string;
  children: ReactNode;
};

const SIZE_CLASSES: Record<IconBlobSize, string> = {
  40: 'size-10',
  48: 'size-12',
};

/** Rounded geometric tile in a tint, holding one icon. The icon takes the deep tone of its tint. */
export function IconBlob({ tint, tone = 'tint', size = 40, label, children }: IconBlobProps) {
  const accessibility = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const fill = tone === 'surface' ? 'bg-surface' : TINT_BG[tint];
  return (
    <span
      data-tint={tint}
      {...accessibility}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-blob [&_svg]:size-5',
        SIZE_CLASSES[size],
        fill,
        TINT_INK[tint],
      )}
    >
      {children}
    </span>
  );
}
