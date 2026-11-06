import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExamProvider, useExam, useExamDispatch } from '@/core/exam/react';
import { createInitialState, isAckValid } from '@/core/exam/state';
import { createExamStore } from '@/core/exam/store';
import { I18nProvider, useI18n, useT } from '@/core/i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '@/core/i18n/locale';
import { copyRegistry } from '@/core/i18n/registry';
import { fixedClock } from '../exam/fixtures';

const clock = fixedClock();

function Probe() {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const phase = useExam((state) => state.phase);
  const ackValid = useExam((state) => isAckValid(state));
  const dispatch = useExamDispatch();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="badge">{t('core.badge.simulated')}</span>
      <span data-testid="phase">{phase}</span>
      <span data-testid="ack">{String(ackValid)}</span>
      <button type="button" onClick={() => setLocale('en')}>english</button>
      <button type="button" onClick={() => dispatch({ type: 'NOTE_SET', note: 'x' })}>note</button>
    </div>
  );
}

function exportedStore() {
  const initial = createInitialState(clock);
  return createExamStore(
    { ...initial, phase: 'exported', ackRegistryVersion: initial.record.registryVersion },
    clock,
  );
}

function setup(navigatorLanguage: string, storage: Storage) {
  const store = exportedStore();
  return render(
    <I18nProvider dictionary={copyRegistry} storage={storage} navigatorLanguage={navigatorLanguage}>
      <ExamProvider store={store}>
        <Probe />
      </ExamProvider>
    </I18nProvider>,
  );
}

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  } as Storage;
}

describe('I18nProvider', () => {
  it('detects the locale from navigator.language on first load', () => {
    setup('en-US', memoryStorage());
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('badge').textContent).toBe('Simulated model');
  });

  it('switches language in place and persists the choice', () => {
    const storage = memoryStorage();
    setup('es-CO', storage);
    expect(screen.getByTestId('badge').textContent).toBe('Modelo simulado');
    act(() => {
      screen.getByRole('button', { name: 'english' }).click();
    });
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('keeps the export acknowledgement and the exam phase when the language changes (G6)', () => {
    setup('es-CO', memoryStorage());
    expect(screen.getByTestId('ack').textContent).toBe('true');
    act(() => {
      screen.getByRole('button', { name: 'english' }).click();
    });
    expect(screen.getByTestId('phase').textContent).toBe('exported');
    expect(screen.getByTestId('ack').textContent).toBe('true');
  });

  it('invalidates the ack on a record change, not on a language change', () => {
    setup('es-CO', memoryStorage());
    act(() => {
      screen.getByRole('button', { name: 'note' }).click();
    });
    expect(screen.getByTestId('ack').textContent).toBe('false');
  });

  it('throws outside the provider', () => {
    expect(() => render(<Probe />)).toThrow();
  });
});
