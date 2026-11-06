import { useId, useState } from 'react';
import { DURATION_COPY, SYMPTOM_COPY } from '@/core/exam/clinicalContext';
import { useT } from '@/core/i18n/I18nProvider';
import {
  CLINICAL_AGE_MAX,
  CLINICAL_DURATIONS,
  CLINICAL_HISTORY_MAX,
  CLINICAL_SYMPTOMS,
  type ClinicalContext,
} from '@/core/storage/types';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { contextFromDraft, draftFromContext, isAgeDraftValid, toggleSymptom, type ClinicalDraft } from './clinicalDraft';

const FIELD_INPUT =
  'min-h-11 w-full rounded-control border border-solid border-line bg-surface px-4 text-[16px] text-ink outline-offset-2';
const OPTION_ROW = 'flex min-h-11 items-center gap-3 text-body text-ink';
const CHIP_BASE =
  'min-h-11 rounded-control border border-solid px-4 text-label outline-offset-2';

export interface ClinicalContextFormProps {
  initial: ClinicalContext | undefined;
  onSave: (context: ClinicalContext) => void;
  onCancel: () => void;
}

/** Optional, user-supplied context. Mounted per open, so each open starts from the saved values. */
export function ClinicalContextForm({ initial, onSave, onCancel }: ClinicalContextFormProps) {
  const t = useT('desk');
  const ids = { age: useId(), ageError: useId(), counter: useId(), history: useId() };
  const [draft, setDraft] = useState<ClinicalDraft>(() => draftFromContext(initial));
  const ageValid = isAgeDraftValid(draft.age);
  const update = (patch: Partial<ClinicalDraft>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (ageValid) onSave(contextFromDraft(draft));
      }}
    >
      <p className="m-0 text-label text-muted">{t('ctxSheetNotice')}</p>

      <div className="flex flex-col gap-2">
        <label htmlFor={ids.age} className="text-body-medium text-ink">
          {t('ctxAge')}
        </label>
        <input
          id={ids.age}
          type="number"
          inputMode="numeric"
          min={0}
          max={CLINICAL_AGE_MAX}
          step={1}
          value={draft.age}
          aria-invalid={!ageValid}
          aria-describedby={ageValid ? undefined : ids.ageError}
          onChange={(event) => update({ age: event.target.value })}
          className={FIELD_INPUT}
        />
        {ageValid ? null : (
          <p id={ids.ageError} className="m-0 text-caption text-error">
            {t('ctxAgeError')}
          </p>
        )}
      </div>

      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-2 p-0 text-body-medium text-ink">{t('ctxDurationTitle')}</legend>
        {CLINICAL_DURATIONS.map((duration) => (
          <label key={duration} className={OPTION_ROW}>
            <input
              type="radio"
              name={`${ids.age}-duration`}
              value={duration}
              checked={draft.duration === duration}
              onChange={() => update({ duration })}
              className="size-5 shrink-0 accent-accent"
            />
            {t(DURATION_COPY[duration])}
          </label>
        ))}
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-body-medium text-ink">{t('ctxSymptomsTitle')}</legend>
        <div className="flex flex-wrap gap-2">
          {CLINICAL_SYMPTOMS.map((symptom) => {
            const active = draft.symptoms.includes(symptom);
            return (
              <button
                key={symptom}
                type="button"
                aria-pressed={active}
                onClick={() => update({ symptoms: toggleSymptom(draft.symptoms, symptom) })}
                className={cx(
                  CHIP_BASE,
                  active ? 'border-accent bg-subtle text-ink' : 'border-line bg-surface text-ink',
                )}
              >
                {t(SYMPTOM_COPY[symptom])}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={ids.history} className="text-body-medium text-ink">
          {t('ctxHistoryTitle')}
        </label>
        <textarea
          id={ids.history}
          rows={4}
          maxLength={CLINICAL_HISTORY_MAX}
          value={draft.history}
          placeholder={t('ctxHistoryPlaceholder')}
          aria-describedby={ids.counter}
          onChange={(event) => update({ history: event.target.value })}
          className={cx(FIELD_INPUT, 'py-3')}
        />
        <p id={ids.counter} className="m-0 text-right text-caption text-muted">
          {`${draft.history.length}/${CLINICAL_HISTORY_MAX}`}
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <Button type="submit" fullWidth disabled={!ageValid}>
          {t('ctxSave')}
        </Button>
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
