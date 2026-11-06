import type { AbcdeCriterion } from '@/core/storage/types';
import { cx } from '@/ui';
import { ABCDE_OPTIONS } from './logic';
import { optionKey, type AbcdeCopyKey } from './copy';

type OptionGroupProps = {
  criterion: AbcdeCriterion;
  name: string;
  selected: string | null;
  onSelect: (value: string) => void;
  t: (key: AbcdeCopyKey) => string;
};

/** Radio-style list of one criterion's options. Selection is explicit state, not inferred from the image. */
export function OptionGroup({ criterion, name, selected, onSelect, t }: OptionGroupProps) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col gap-2">
      {ABCDE_OPTIONS[criterion].map((value) => {
        const checked = selected === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onSelect(value)}
            className={cx(
              'flex min-h-13 w-full items-center gap-3 rounded-control border border-solid bg-surface px-3 text-left outline-offset-2 transition-[transform,background-color] duration-(--motion-press) ease-out active:scale-[0.97] motion-reduce:transition-none',
              checked ? 'border-accent' : 'border-line',
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'flex size-6 shrink-0 items-center justify-center rounded-full border border-solid',
                checked ? 'border-accent bg-accent' : 'border-line bg-surface',
              )}
            >
              {checked ? <span className="size-2 rounded-full bg-on-accent" /> : null}
            </span>
            <span className="text-body-medium text-ink">{t(optionKey(criterion, value))}</span>
          </button>
        );
      })}
    </div>
  );
}
