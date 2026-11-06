import { useNavigate } from '@/app/router';
import { AppShell } from '@/features/desk/AppShell';
import { CAPTURE_PATH, CONSENT_PATH, QUALITY_PATH } from '@/features/desk/recoveryPaths';
import { useExam } from '@/features/desk/api';
import { Button } from '@/ui/Button';
import type { RecoveryScenario } from '@/core/inference/types';
import { RECOVERY_COPY } from './copy';

interface RecoveryTargets {
  primary: string;
  secondary?: string;
  back: string;
}

const EXPORT_COMPARE_PATH = '/examen/comparar';
const CAMERA_PATH = '/imagen/camara';

/** Where each recovery page sends the user (design/architecture.md section 3). */
export const RECOVERY_TARGETS: Record<RecoveryScenario, RecoveryTargets> = {
  'file-unavailable': { primary: CAPTURE_PATH, back: CAPTURE_PATH },
  permission: { primary: CAPTURE_PATH, secondary: CAMERA_PATH, back: CAPTURE_PATH },
  offline: { primary: CONSENT_PATH, back: QUALITY_PATH },
  'server-error': { primary: QUALITY_PATH, secondary: CONSENT_PATH, back: QUALITY_PATH },
  timeout: { primary: QUALITY_PATH, secondary: CONSENT_PATH, back: QUALITY_PATH },
  'invalid-response': { primary: QUALITY_PATH, secondary: CONSENT_PATH, back: QUALITY_PATH },
  'rate-limit': { primary: QUALITY_PATH, secondary: CONSENT_PATH, back: QUALITY_PATH },
  'export-unavailable': { primary: EXPORT_COMPARE_PATH, back: EXPORT_COMPARE_PATH },
};

export interface RecoveryPageProps {
  scenario: RecoveryScenario;
}

/** One screen per recovery scenario. The record is preserved; nothing is retried automatically. */
export function RecoveryPage({ scenario }: RecoveryPageProps) {
  const navigate = useNavigate();
  const locale = useExam((s) => s.locale);
  const copy = RECOVERY_COPY[locale][scenario];
  const targets = RECOVERY_TARGETS[scenario];
  const secondaryPath = targets.secondary ?? targets.primary;
  return (
    <AppShell title={copy.shell} onBack={() => navigate(targets.back)} showNav={false}>
      <p role="alert" className="sr-only">
        {copy.title}
      </p>
      <h1 className="m-0 text-title text-ink">{copy.title}</h1>
      <p className="m-0 text-body text-ink">{copy.body}</p>
      {copy.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-1">
          <h2 className="m-0 text-section text-ink">{section.heading}</h2>
          <p className="m-0 text-label text-muted">{section.text}</p>
        </section>
      ))}
      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button fullWidth onClick={() => navigate(targets.primary)}>
          {copy.primary}
        </Button>
        {copy.secondary && targets.secondary ? (
          <Button variant="secondary" fullWidth onClick={() => navigate(secondaryPath)}>
            {copy.secondary}
          </Button>
        ) : null}
      </div>
    </AppShell>
  );
}
