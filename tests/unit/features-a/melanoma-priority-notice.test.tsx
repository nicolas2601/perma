import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/core/i18n/I18nProvider';
import { copyRegistry } from '@/core/i18n/registry';
import type { InferenceResult, ScreeningResult } from '@/core/inference/types';
import { MelanomaPriorityNotice } from '@/features/inspect/MelanomaPriorityNotice';

const NESTED = {
  targetRecall: 0.7673,
  targetToNevus: 0.1321,
  nevusRecall: 0.7592,
  targetPrecision: 0.3239,
  targetAlertRate: 0.2627,
  macroF1: 0.6023,
};

const ALERT: ScreeningResult = {
  status: 'ok',
  ruleId: 'melanoma-priority-v1',
  target: 'mel',
  logOffset: 1.5,
  pred: 'mel',
  alert: true,
  differsFromPred: true,
  development: { atZero: { ...NESTED, targetRecall: 0.54 }, nested: NESTED },
};

function resultWith(screening: ScreeningResult | undefined): InferenceResult {
  return {
    source: 'live',
    model: 'MOCO_HAM7',
    mode: 'base',
    identity: { modelId: 'dermssl-v10-moco', sha256: null, sha256Verified: null, recipe: null, release: 'v10.1.0' },
    scores: { akiec: 0.01, bcc: 0.01, bkl: 0.02, df: 0.01, mel: 0.3, nv: 0.6, vasc: 0.05 },
    latencyMs: 1,
    warnings: [],
    ...(screening === undefined ? {} : { screening }),
  };
}

const storage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } as unknown as Storage;

function withI18n(node: ReactNode, language = 'es-CO') {
  return (
    <I18nProvider dictionary={copyRegistry} storage={storage} navigatorLanguage={language}>
      {node}
    </I18nProvider>
  );
}

describe('MelanomaPriorityNotice', () => {
  it('shows the melanoma signal with the development numbers when the screening point flags melanoma', () => {
    render(withI18n(<MelanomaPriorityNotice result={resultWith(ALERT)} />));

    const note = screen.getByRole('note', { name: 'Señal de melanoma' });
    expect(note.textContent).toContain('77 de cada 100 melanomas');
    expect(note.textContent).toContain('32 de cada 100');
  });

  it('renders in English with the same numbers', () => {
    render(withI18n(<MelanomaPriorityNotice result={resultWith(ALERT)} />, 'en-US'));

    expect(screen.getByRole('note', { name: 'Melanoma signal' }).textContent).toContain('77 of every 100 melanomas');
  });

  it('omits the numbers when the backend sends no development block', () => {
    render(withI18n(<MelanomaPriorityNotice result={resultWith({ ...ALERT, development: null })} />));

    expect(screen.getByRole('note', { name: 'Señal de melanoma' }).textContent).not.toContain('de cada 100');
  });

  it.each([
    ['no alert', { ...ALERT, alert: false, differsFromPred: false, pred: 'nv' } as ScreeningResult],
    ['melanoma already ranked first', { ...ALERT, differsFromPred: false } as ScreeningResult],
    ['policy unavailable', { status: 'unavailable', reason: 'policy_not_configured' } as ScreeningResult],
    ['older backend', undefined],
  ])('renders nothing for %s', (_label, screening) => {
    const { container } = render(withI18n(<MelanomaPriorityNotice result={resultWith(screening)} />));

    expect(container.querySelector('[role="note"]')).toBeNull();
  });

  it('renders nothing for simulated results', () => {
    const { container } = render(
      withI18n(<MelanomaPriorityNotice result={{ ...resultWith(ALERT), source: 'mock' }} />),
    );

    expect(container.querySelector('[role="note"]')).toBeNull();
  });
});
