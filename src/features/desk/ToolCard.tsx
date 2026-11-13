import { useId } from 'react';
import { cx } from '@/ui/cx';
import { ArrowUpRightIcon } from '@/ui/icons';

export type ToolCardTone = 'surface' | 'bruma' | 'crema';
/** `textTop` places the art below the text on desktop; `artTop` frames it above, as a specimen. */
export type ToolCardLayout = 'textTop' | 'artTop';

export type ToolCardProps = {
  title: string;
  body: string;
  link: string;
  art: string;
  onSelect: () => void;
  tone?: ToolCardTone;
  layout?: ToolCardLayout;
  /** Caption under a framed specimen (artTop only). */
  caption?: string;
};

const TONE: Record<ToolCardTone, string> = {
  surface: 'bg-surface border-soft-line',
  bruma: 'bg-bruma border-transparent',
  crema: 'bg-crema border-soft-line',
};

/** Muted text fails 4.5:1 on Bruma (4.05), so that tone uses a darker ink for the body. */
const BODY_TONE: Record<ToolCardTone, string> = {
  surface: 'text-muted',
  bruma: 'text-ink/80',
  crema: 'text-muted',
};

function Art({ art, layout, caption }: { art: string; layout: ToolCardLayout; caption?: string }) {
  if (layout === 'artTop') {
    return (
      <span className="flex h-23 w-29 shrink-0 overflow-hidden rounded-[14px] bg-papel lg:order-1 lg:h-auto lg:w-full lg:flex-col lg:gap-2 lg:overflow-visible lg:rounded-xl lg:bg-surface lg:p-3 lg:pb-2.5 lg:shadow-raised">
        <span className="flex h-full w-full items-center justify-center overflow-hidden lg:h-37.5 lg:rounded-[4px] lg:bg-durazno/20">
          <img src={art} alt="" width={400} height={170} decoding="async" className="h-full w-auto max-w-none lg:h-auto lg:w-full" />
        </span>
        {caption ? <span className="hidden text-caption text-muted lg:block">{caption}</span> : null}
      </span>
    );
  }
  return (
    <span className="flex h-23 w-29 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-papel lg:order-2 lg:h-auto lg:min-h-40 lg:w-full lg:flex-1 lg:items-end lg:rounded-none lg:bg-transparent">
      <img src={art} alt="" width={420} height={200} decoding="async" className="h-full w-auto max-w-none lg:h-auto lg:w-full" />
    </span>
  );
}

/** Home tool card: a compact row on phones, a tall bento card on desktop. The title names the action. */
export function ToolCard({ title, body, link, art, onSelect, tone = 'surface', layout = 'textTop', caption }: ToolCardProps) {
  const titleId = useId();
  const bodyId = useId();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className={cx(
        'flex h-full w-full cursor-pointer items-center gap-3.5 rounded-[20px] border border-solid py-3.5 pr-4.5 pl-3.5 text-left text-ink outline-offset-2',
        'transition-transform duration-(--motion-card) ease-perma-out active:scale-[0.98] motion-reduce:active:scale-100',
        'lg:flex-col lg:items-stretch lg:gap-5 lg:px-7 lg:pt-7 lg:pb-6',
        TONE[tone],
      )}
    >
      <Art art={art} layout={layout} caption={caption} />
      <span className={cx('flex min-w-0 flex-1 flex-col gap-1 lg:flex-none lg:gap-2.5', layout === 'artTop' ? 'lg:order-2' : 'lg:order-1')}>
        <span id={titleId} className="text-[19px] leading-6 font-medium tracking-[-0.005em] lg:text-[34px] lg:leading-[38px] lg:font-normal lg:tracking-[-0.01em]">
          {title}
        </span>
        <span id={bodyId} className={cx('text-[13px] leading-[18px] lg:text-[14px] lg:leading-5', BODY_TONE[tone])}>
          {body}
        </span>
      </span>
      <ArrowUpRightIcon className="size-4.5 shrink-0 lg:hidden" />
      <span aria-hidden="true" className="hidden items-center justify-between text-label text-ink lg:order-3 lg:mt-auto lg:flex">
        {link}
        <ArrowUpRightIcon className="size-4" />
      </span>
    </button>
  );
}
