import { cx } from './cx';
import { TINT_INK, type TintOrNeutral } from './tints';

export type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  /** Colors the small geometric accent only. */
  tint?: TintOrNeutral;
  as?: 'h2' | 'h3';
};

/** Quarter-circle accent, decorative. Filled with the current color so the tint drives it. */
function GeometricAccent({ tint }: { tint: TintOrNeutral }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 10" className={cx('size-2.5 shrink-0 fill-current', TINT_INK[tint])}>
      <path d="M0 10A10 10 0 0 1 10 0V10Z" />
    </svg>
  );
}

/** Eyebrow plus title with a small geometric accent. The eyebrow is plain text, not a second heading. */
export function SectionHeading({ eyebrow, title, tint = 'neutral', as: Heading = 'h2' }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-1">
      {eyebrow ? <p className="m-0 text-header text-muted">{eyebrow}</p> : null}
      <Heading className="m-0 flex items-center gap-2 text-section text-ink">
        <GeometricAccent tint={tint} />
        <span>{title}</span>
      </Heading>
    </div>
  );
}
