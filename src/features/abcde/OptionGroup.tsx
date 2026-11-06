import { motion } from 'motion/react';
import type { AbcdeCriterion } from '@/core/storage/types';
import { cx } from '@/ui';
import { usePressScale } from '@/motion';
import { ABCDE_OPTIONS } from './logic';
import { optionKey } from './copy';

type OptionGroupProps = {
  criterion: AbcdeCriterion;
  name: string;
  selected: string | null;
  onSelect: (value: string) => void;
  t: (key: string) => string;
};

/** Radio-style list of one criterion's options. Selection is explicit state, not inferred from the image. */
export function OptionGroup({ criterion, name, selected, onSelect, t }: OptionGroupProps) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col gap-2">
      {ABCDE_OPTIONS[criterion].map((value) => (
        <OptionButton
          key={value}
          checked={selected === value}
          label={t(optionKey(criterion, value))}
          onSelect={() => onSelect(value)}
        />
      ))}
    </div>
  );
}

function OptionButton({ checked, label, onSelect }: { checked: boolean; label: string; onSelect: () => void }) {
  const press = usePressScale(false);
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      whileTap={press.whileTap}
      transition={press.transition}
      className={cx(
        'flex min-h-13 w-full items-center gap-3 rounded-control border border-solid bg-surface px-3 text-left outline-offset-2',
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
      <span className="text-body-medium text-ink">{label}</span>
    </motion.button>
  );
}
