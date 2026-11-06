import { describe, expect, it } from 'vitest';
import { RECOVERY_TARGET } from '@/core/exam/tables';
import { copyRegistry } from '@/core/i18n/registry';
import { copy as cameraCopy } from '@/features/camera/copy';
import { copy as deskCopy } from '@/features/desk/copy';
import { copy as consentCopy } from '@/features/consent/copy';
import { copy as recoveryCopy } from '@/features/recovery/copy';
import { RECOVERY_PATHS, CAMERA_PATH, CAPTURE_PATH, CONSENT_PATH, PROCESSING_PATH, QUALITY_PATH } from '@/features/desk/recoveryPaths';
import { RECOVERY_TARGETS } from '@/features/recovery/RecoveryPage';
import { activeNavId } from '@/features/desk/AppShell';
import { deskRoutes } from '@/features/desk/routes';
import { cameraRoutes } from '@/features/camera/routes';
import { consentRoutes } from '@/features/consent/routes';
import { recoveryRoutes } from '@/features/recovery/routes';
import type { ExamPhase } from '@/core/exam/contract';
import type { RecoveryScenario } from '@/core/inference/types';

type Table = { readonly es: Record<string, string>; readonly en: Record<string, string> };

const FEATURE_TABLES: Record<string, Table> = {
  desk: deskCopy,
  camera: cameraCopy,
  consent: consentCopy,
  recovery: recoveryCopy,
};

describe('feature copy modules', () => {
  it.each(Object.entries(FEATURE_TABLES))('%s exports copy with identical es and en keys', (_name, table) => {
    expect(Object.keys(table.en).sort()).toEqual(Object.keys(table.es).sort());
  });

  it('merges every feature into the registry under its namespace, without collisions', () => {
    expect(copyRegistry.es['desk.headline']).toBe('Empiece con contexto.');
    expect(copyRegistry.en['desk.headline']).toBe('Start with context.');
    expect(copyRegistry.es['consent.title']).toBe('Sepa qué envía.');
    expect(copyRegistry.es['consent.waitTitle']).toBe('Esperando una respuesta');
    expect(copyRegistry.es['recovery.rate-limit.title']).toBe('El servicio está limitando las solicitudes.');
    expect(copyRegistry.es['camera.captureTitle']).toBe('Muestre la imagen.');
  });

  it('keeps the Figma-verified recovery titles in both locales', () => {
    const scenarios = Object.keys(RECOVERY_PATHS) as RecoveryScenario[];
    for (const scenario of scenarios) {
      expect(recoveryCopy.es[`${scenario}.title`]).toBeTruthy();
      expect(recoveryCopy.en[`${scenario}.title`]).toBeTruthy();
    }
  });

  it('never ships Figma prototype labels as production copy (O5)', () => {
    const all = JSON.stringify([consentCopy, deskCopy]);
    expect(all).not.toMatch(/escenario de procesamiento|resultado ficticio|Abrir escenario/i);
  });
});

describe('recovery targets agree with the reducer table', () => {
  const PAGE_PHASE: Record<string, ExamPhase> = {
    [CAPTURE_PATH]: 'capturing',
    [CAMERA_PATH]: 'capturing',
    [QUALITY_PATH]: 'reviewing',
    [CONSENT_PATH]: 'consenting',
    '/examen/comparar': 'compare',
  };

  it('covers all eight scenarios with a route each', () => {
    expect(Object.keys(RECOVERY_TARGETS).sort()).toEqual(Object.keys(RECOVERY_PATHS).sort());
    expect(recoveryRoutes.map((r) => r.path).sort()).toEqual(Object.values(RECOVERY_PATHS).sort());
  });

  it.each(Object.keys(RECOVERY_TARGETS) as RecoveryScenario[])('%s: each button lands on the phase the reducer returns', (scenario) => {
    const targets = RECOVERY_TARGETS[scenario];
    const actions = [targets.primary, targets.back, ...(targets.secondary ? [targets.secondary] : [])];
    for (const action of actions) {
      expect(PAGE_PHASE[action.path]).toBe(RECOVERY_TARGET[scenario][action.mode]);
    }
  });
});

describe('routes', () => {
  it('exports the lazy routes of the features-A lane', () => {
    const paths = [...deskRoutes, ...cameraRoutes, ...consentRoutes].map((r) => r.path);
    expect(paths).toEqual([
      '/',
      '/contexto',
      '/imagen',
      '/imagen/camara',
      '/imagen/muestras',
      '/imagen/calidad',
      '/envio',
      PROCESSING_PATH,
    ]);
  });

  it('maps paths to the active nav entry', () => {
    expect(activeNavId('/contexto')).toBe('/');
    expect(activeNavId('/imagen/calidad')).toBe('/imagen');
    expect(activeNavId('/envio/procesando')).toBe('/imagen');
    expect(activeNavId('/recuperacion/limite')).toBeUndefined();
  });
});
