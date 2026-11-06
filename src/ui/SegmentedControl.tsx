import { useRef, type KeyboardEvent } from 'react';
import { cx } from './cx';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Accessible name of the group, e.g. "Idioma". */
  label: string;
};

const ARROW_STEP: Record<string, number> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

/** Radio group (ES / EN). Selection is weight + border + fill, not hue alone. */
export function SegmentedControl<T extends string>({ options, value, onValueChange, label }: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const next = options[index];
    if (!next) return;
    onValueChange(next.value);
    refs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = ARROW_STEP[event.key];
    if (step === undefined) return;
    event.preventDefault();
    select((index + step + options.length) % options.length);
  };

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1.5">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            data-state={selected ? 'checked' : 'unchecked'}
            className={cx(
              'inline-flex size-12 items-center justify-center rounded-chip border border-solid text-header outline-offset-2 transition-[background-color,border-color] duration-(--motion-press) ease-out',
              selected ? 'border-ink bg-subtle font-semibold text-ink' : 'border-line bg-surface font-medium text-ink enabled:fine-hover:bg-subtle',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
