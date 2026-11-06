import { useT } from '@/core/i18n/I18nProvider';
import { Stepper } from '@/ui/Stepper';
import { JOURNEY_STEP_IDS, JOURNEY_TOTAL, journeySteps, type JourneyStepId } from './journey';

/**
 * Below 360 px the six 44 px targets plus the current label overflow. The label becomes screen-reader-only and
 * the current pill narrows to a 24 px capsule in the same tint, so the step stays visible without overflow.
 */
const COMPACT_HIDE_LABEL =
  'max-[359px]:[&_[data-state=current]]:w-6 max-[359px]:[&_[data-state=current]]:px-0 max-[359px]:[&_[data-state=current]>span]:sr-only';

/** Eyebrow plus the six-step journey indicator shown on journey pages. */
export function JourneyProgress({ current }: { current: JourneyStepId }) {
  const t = useT('desk');
  const position = JOURNEY_STEP_IDS.indexOf(current) + 1;
  const eyebrow = t('stepEyebrow').replace('{n}', String(position)).replace('{total}', String(JOURNEY_TOTAL));
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-caption text-muted">{eyebrow}</p>
      <div className={COMPACT_HIDE_LABEL}>
        <Stepper steps={journeySteps(t)} currentId={current} label={t('stepperLabel')} />
      </div>
    </div>
  );
}
