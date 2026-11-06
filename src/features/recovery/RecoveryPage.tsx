import { useNavigate } from '@/app/router';
import type { RecoveryMode } from '@/core/exam/commands';
import { useExamDispatch } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import type { RecoveryScenario } from '@/core/inference/types';
import { AppShell } from '@/features/desk/AppShell';
import {
  CAPTURE_PATH,
  CONSENT_PATH,
  EXPORT_COMPARE_PATH,
  QUALITY_PATH,
} from '@/features/desk/recoveryPaths';
import { Button } from '@/ui/Button';

interface RecoveryAction {
  path: string;
  /** Matches the reducer's RECOVERY_TARGET table: `back` returns to the review, `retry` re-enters the send step. */
  mode: RecoveryMode;
}

interface RecoveryTargets {
  primary: RecoveryAction;
  secondary?: RecoveryAction;
  back: RecoveryAction;
}

const TO_CAPTURE: RecoveryAction = { path: CAPTURE_PATH, mode: 'back' };
const TO_REVIEW: RecoveryAction = { path: QUALITY_PATH, mode: 'back' };
const TO_SEND: RecoveryAction = { path: CONSENT_PATH, mode: 'retry' };

/** Where each recovery page sends the user (design/architecture.md section 3). */
export const RECOVERY_TARGETS: Record<RecoveryScenario, RecoveryTargets> = {
  'file-unavailable': { primary: TO_CAPTURE, back: TO_CAPTURE },
  permission: { primary: TO_CAPTURE, back: TO_CAPTURE },
  offline: { primary: TO_SEND, back: TO_REVIEW },
  'server-error': { primary: TO_REVIEW, back: TO_REVIEW },
  timeout: { primary: TO_REVIEW, back: TO_REVIEW },
  'invalid-response': { primary: TO_REVIEW, back: TO_REVIEW },
  'rate-limit': { primary: TO_REVIEW, back: TO_REVIEW },
  'export-unavailable': {
    primary: { path: EXPORT_COMPARE_PATH, mode: 'back' },
    back: { path: EXPORT_COMPARE_PATH, mode: 'back' },
  },
};

/** Number of heading/text pairs each page shows (keys in recovery/copy.ts). */
const SECTION_COUNT: Record<RecoveryScenario, number> = {
  'file-unavailable': 1,
  permission: 2,
  offline: 2,
  'server-error': 0,
  timeout: 0,
  'invalid-response': 2,
  'rate-limit': 0,
  'export-unavailable': 0,
};

export interface RecoveryPageProps {
  scenario: RecoveryScenario;
}

/** One screen per recovery scenario. The record is preserved; nothing is retried automatically. */
export function RecoveryPage({ scenario }: RecoveryPageProps) {
  const t = useT('recovery');
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const targets = RECOVERY_TARGETS[scenario];
  const go = (action: RecoveryAction) => {
    dispatch({ type: 'RECOVER', scenario, mode: action.mode });
    navigate(action.path);
  };
  const secondary = targets.secondary;
  const sectionIndexes = Array.from({ length: SECTION_COUNT[scenario] }, (_, i) => i + 1);
  return (
    <AppShell title={t(`${scenario}.shell`)} onBack={() => go(targets.back)} showNav={false}>
      <p role="alert" className="sr-only">
        {t(`${scenario}.title`)}
      </p>
      <h1 className="m-0 text-title text-ink">{t(`${scenario}.title`)}</h1>
      <p className="m-0 text-body text-ink">{t(`${scenario}.body`)}</p>
      {sectionIndexes.map((n) => (
        <section key={n} className="flex flex-col gap-1">
          <h2 className="m-0 text-section text-ink">{t(`${scenario}.heading${n}`)}</h2>
          <p className="m-0 text-label text-muted">{t(`${scenario}.text${n}`)}</p>
        </section>
      ))}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button fullWidth onClick={() => go(targets.primary)}>
          {t(`${scenario}.primary`)}
        </Button>
        {secondary ? (
          <Button variant="secondary" fullWidth onClick={() => go(secondary)}>
            {t(`${scenario}.secondary`)}
          </Button>
        ) : null}
      </div>
    </AppShell>
  );
}
