import { cx } from './cx';

export type StatusTone = 'info' | 'success' | 'error';

export type StatusLineProps = {
  /** Null or empty renders the live region with no visible text. */
  message: string | null;
  tone?: StatusTone;
};

const TONE_GLYPH: Record<StatusTone, string> = { info: 'i', success: '✓', error: '!' };

const TONE_CLASSES: Record<StatusTone, string> = {
  info: 'border-line bg-surface text-ink',
  success: 'border-line bg-surface text-ink',
  error: 'border-error bg-error-surface text-error',
};

/** Persistent live region. Errors are announced assertively; other tones politely. */
export function StatusLine({ message, tone = 'info' }: StatusLineProps) {
  const visible = Boolean(message);
  return (
    <div
      role="status"
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-tone={tone}
      className={cx(
        'flex min-h-11 items-center gap-2 rounded-control text-label',
        visible && 'border border-solid px-3 py-2',
        visible && TONE_CLASSES[tone],
      )}
    >
      {visible ? (
        <>
          <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center font-semibold">
            {TONE_GLYPH[tone]}
          </span>
          <span>{message}</span>
        </>
      ) : null}
    </div>
  );
}
