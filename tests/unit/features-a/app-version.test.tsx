import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import packageJson from '../../../package.json';
import { I18nProvider } from '@/core/i18n/I18nProvider';
import { copyRegistry } from '@/core/i18n/registry';
import type { InferenceResult } from '@/core/inference/types';
import { APP_VERSION } from '@/app/version';
import { ModelDetailsSheet } from '@/features/inspect/ModelDetailsSheet';

const storage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } as unknown as Storage;

const RESULT: InferenceResult = {
  source: 'live',
  model: 'MOCO_HAM7',
  mode: 'base',
  identity: { modelId: 'dermssl-v10-moco', sha256: null, sha256Verified: null, recipe: null, release: 'v10.1.0' },
  scores: { akiec: 0, bcc: 0, bkl: 0, df: 0, mel: 0, nv: 1, vasc: 0 },
  latencyMs: 1,
  warnings: [],
};

describe('app version', () => {
  it('comes from package.json at build time', () => {
    expect(APP_VERSION).toBe(packageJson.version);
    expect(packageJson.name).toBe('vera');
  });

  it('is listed in the model details sheet next to the model release', () => {
    render(
      <I18nProvider dictionary={copyRegistry} storage={storage} navigatorLanguage="es-CO">
        <ModelDetailsSheet open onOpenChange={() => undefined} result={RESULT} />
      </I18nProvider>,
    );

    expect(screen.getByText('Versión de VERA')).toBeTruthy();
    expect(screen.getByText(packageJson.version)).toBeTruthy();
  });
});
