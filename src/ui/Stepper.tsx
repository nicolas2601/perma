import { cx } from './cx';
import type { TintOrNeutral } from './tints';

export type StepDef = {
  id: string;
  label: string;
  tint?: TintOrNeutral;
};

export type StepperProps = {
  steps: readonly StepDef[];
  currentId: string;
  /** Accessible name of the navigation landmark. */
  label: string;
  /** When given, every step is a button. Navigation is never blocked: any step can be chosen. */
  onSelect?: (id: string) => void;
};

type StepState = 'complete' | 'current' | 'upcoming';

const HIT_AREA = 'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full';

const DOT_CLASSES: Record<Exclude<StepState, 'current'>, string> = {
  complete: 'size-2 bg-muted',
  upcoming: 'size-2 bg-line',
};

function stepState(index: number, currentIndex: number): StepState {
  if (index === currentIndex) return 'current';
  return index < currentIndex ? 'complete' : 'upcoming';
}

function Marker({ step, state }: { step: StepDef; state: StepState }) {
  if (state !== 'current') {
    return (
      <span data-state={state} className={cx('inline-flex rounded-full', DOT_CLASSES[state])}>
        <span className="sr-only">{step.label}</span>
      </span>
    );
  }
  const tint = step.tint ?? 'neutral';
  return (
    <span
      data-state={state}
      data-tint={tint}
      className="inline-flex h-8 items-center rounded-full bg-accent px-3 text-on-accent"
    >
      <span className="animate-(--animate-perma-fade) text-label font-medium">{step.label}</span>
    </span>
  );
}

function StepItem({ step, state, onSelect }: { step: StepDef; state: StepState; onSelect?: (id: string) => void }) {
  const marker = <Marker step={step} state={state} />;
  return (
    <li aria-current={state === 'current' ? 'step' : undefined} className="flex">
      {onSelect ? (
        <button type="button" onClick={() => onSelect(step.id)} className={cx(HIT_AREA, 'outline-offset-2')}>
          {marker}
        </button>
      ) : (
        <span className={HIT_AREA}>{marker}</span>
      )}
    </li>
  );
}

/** Compact six-step journey. The current step is an accent chip with its label (its tint is kept as data-tint); others are dots with screen-reader names. */
export function Stepper({ steps, currentId, label, onSelect }: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentId);
  return (
    <nav aria-label={label}>
      <ol role="list" className="m-0 flex list-none items-center p-0">
        {steps.map((step, index) => (
          <StepItem key={step.id} step={step} state={stepState(index, currentIndex)} onSelect={onSelect} />
        ))}
      </ol>
    </nav>
  );
}
