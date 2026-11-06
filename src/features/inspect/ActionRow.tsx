import type { ReactNode } from 'react';
import { Card, IconBlob, cx, type Tint } from '@/ui';
import { Link } from '@/app/router';

export type ActionRowProps = {
  /** Identity of the section the row opens. Never a result or a score. */
  tint: Tint;
  variant?: 'soft' | 'raised';
  icon: ReactNode;
  title: string;
  hint?: string;
  /** Navigates when set; otherwise the row is a button calling `onClick`. */
  to?: string;
  onClick?: () => void;
  /** Desktop only (lg): icon above the text, so two rows can share a narrow column. Mobile is unchanged. */
  tile?: boolean;
};

/**
 * Bleeds the tappable area to the card edge: the card padding (p-4) becomes the tap target.
 * Grid, never flex-col, on the button (WebKit). Inset focus ring so it survives the card's overflow clip.
 */
const ROW_CLASS =
  '-m-4 grid min-h-14 grid-cols-[auto_1fr_auto] items-center gap-3 p-4 text-left outline-offset-2 focus-visible:-outline-offset-2';
const TILE_CLASS = 'lg:grid-cols-1 lg:content-start lg:justify-items-start lg:gap-3';

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('size-5 shrink-0 text-muted', className)}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

type RowBodyProps = Pick<ActionRowProps, 'tint' | 'variant' | 'icon' | 'title' | 'hint' | 'tile'>;

function RowBody({ tint, variant, icon, title, hint, tile }: RowBodyProps) {
  return (
    <>
      <IconBlob tint={tint} tone={variant === 'raised' ? 'tint' : 'surface'}>
        {icon}
      </IconBlob>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-body-medium text-ink">{title}</span>
        {hint ? <span className="text-label text-muted">{hint}</span> : null}
      </span>
      <ChevronRight className={tile ? 'lg:hidden' : undefined} />
    </>
  );
}

/** Tappable row on a kit card (soft tint or raised white). The whole card is the target. */
export function ActionRow({ tint, variant = 'soft', icon, title, hint, to, onClick, tile = false }: ActionRowProps) {
  const body = <RowBody tint={tint} variant={variant} icon={icon} title={title} hint={hint} tile={tile} />;
  const rowClass = cx(ROW_CLASS, tile && TILE_CLASS);
  return (
    <Card variant={variant} tint={tint} interactive className="shrink-0">
      {to ? (
        <Link to={to} className={rowClass}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={rowClass}>
          {body}
        </button>
      )}
    </Card>
  );
}
