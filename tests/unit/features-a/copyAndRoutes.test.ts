import { afterEach, describe, expect, it, vi } from 'vitest';
import { cameraCopy, contextCopy, homeCopy, shellCopy } from '@/features/desk/copy';
import { consentCopy, processingCopy } from '@/features/consent/copy';
import { RECOVERY_COPY } from '@/features/recovery/copy';
import { RECOVERY_PATHS } from '@/features/desk/recoveryPaths';
import { RECOVERY_TARGETS } from '@/features/recovery/RecoveryPage';
import { activeNavId } from '@/features/desk/AppShell';
import { CameraDeniedError, CameraUnavailableError, openCamera } from '@/features/desk/cameraStream';
import { deskRoutes } from '@/features/desk/routes';
import { cameraRoutes } from '@/features/camera/routes';
import { consentRoutes } from '@/features/consent/routes';
import { recoveryRoutes } from '@/features/recovery/routes';

type Table = { es: Record<string, string>; en: Record<string, string> };

const TABLES: Record<string, Table> = {
  shell: shellCopy,
  home: homeCopy,
  context: contextCopy,
  camera: cameraCopy,
  consent: consentCopy,
  processing: processingCopy,
};

describe('copy tables', () => {
  it.each(Object.entries(TABLES))('%s has identical keys in es and en', (_name, table) => {
    expect(Object.keys(table.en).sort()).toEqual(Object.keys(table.es).sort());
  });

  it('recovery copy covers all eight scenarios in both locales', () => {
    const scenarios = Object.keys(RECOVERY_PATHS).sort();
    expect(Object.keys(RECOVERY_COPY.es).sort()).toEqual(scenarios);
    expect(Object.keys(RECOVERY_COPY.en).sort()).toEqual(scenarios);
  });

  it('never ships Figma prototype labels as production copy (O5)', () => {
    const all = JSON.stringify([consentCopy, processingCopy]);
    expect(all).not.toMatch(/escenario de procesamiento|resultado ficticio|Abrir escenario/i);
  });
});

describe('routes', () => {
  it('every recovery scenario has a route and a target', () => {
    expect(Object.keys(RECOVERY_TARGETS).sort()).toEqual(Object.keys(RECOVERY_PATHS).sort());
    expect(recoveryRoutes.map((r) => r.path).sort()).toEqual(Object.values(RECOVERY_PATHS).sort());
  });

  it('exports the lazy routes of the features-A lane', () => {
    const paths = [...deskRoutes, ...cameraRoutes, ...consentRoutes].map((r) => r.path);
    expect(paths).toEqual(['/', '/contexto', '/imagen', '/imagen/camara', '/imagen/muestras', '/imagen/calidad', '/envio', '/envio/procesando']);
  });

  it('maps paths to the active nav entry', () => {
    expect(activeNavId('/contexto')).toBe('/');
    expect(activeNavId('/imagen/calidad')).toBe('/imagen');
    expect(activeNavId('/envio/procesando')).toBe('/imagen');
    expect(activeNavId('/recuperacion/limite')).toBeUndefined();
  });
});

describe('openCamera error mapping', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps a permission denial to CameraDeniedError', async () => {
    const denied = new DOMException('denied', 'NotAllowedError');
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(() => Promise.reject(denied)) } });
    await expect(openCamera()).rejects.toBeInstanceOf(CameraDeniedError);
  });

  it('maps a missing API to CameraUnavailableError', async () => {
    vi.stubGlobal('navigator', {});
    await expect(openCamera()).rejects.toBeInstanceOf(CameraUnavailableError);
  });
});
