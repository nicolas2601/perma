import type { ReactNode } from 'react';

export type EmptyStateProps = {
  /** Illustration slot, usually from src/assets/illustrations. Decorative, hidden from assistive tech. */
  art?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  titleAs?: 'h2' | 'h3';
};

/** Empty region: optional art, a title that says what is missing, one line of guidance and an optional action. */
export function EmptyState({ art, title, body, action, titleAs: Heading = 'h2' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
      {art ? (
        <div aria-hidden="true" className="flex justify-center">
          {art}
        </div>
      ) : null}
      <Heading className="m-0 text-section text-ink">{title}</Heading>
      {body ? <p className="m-0 max-w-[32ch] text-body text-muted">{body}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
