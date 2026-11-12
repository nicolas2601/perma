import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Router } from '@/app/router';
import { ExamProvider } from '@/core/exam/react';
import { createInitialState } from '@/core/exam/state';
import { createExamStore } from '@/core/exam/store';
import { I18nProvider } from '@/core/i18n/I18nProvider';
import { LOCALE_STORAGE_KEY } from '@/core/i18n/locale';
import { copyRegistry } from '@/core/i18n/registry';
import { copy } from '@/features/desk/copy';
import { ClinicalContextForm } from '@/features/desk/ClinicalContextForm';
import { OptionsSheet } from '@/features/desk/HomeSheets';
import Home from '@/features/desk/Home';
import { CLINICAL_COPY, DURATION_COPY, SYMPTOM_COPY } from '@/core/exam/clinicalContext';
import { fixedClock } from '../exam/fixtures';
import { stubReducedMotion } from '../ui/support';

const clock = fixedClock();

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  } as unknown as Storage & { setItem: ReturnType<typeof vi.fn> };
}

function renderWithI18n(ui: ReactElement, storage = memoryStorage()) {
  return render(
    <I18nProvider dictionary={copyRegistry} storage={storage} navigatorLanguage="es-CO">
      {ui}
    </I18nProvider>,
  );
}

const handlers = () => ({ onScope: vi.fn(), onGuide: vi.fn(), onDelete: vi.fn() });

describe('desk copy', () => {
  it('keeps ES and EN keys identical, including the clinical-context keys', () => {
    expect(Object.keys(copy.en).sort()).toEqual(Object.keys(copy.es).sort());
  });

  it('defines every label the clinical context helpers ask for', () => {
    const keys = [
      ...Object.values(DURATION_COPY),
      ...Object.values(SYMPTOM_COPY),
      ...Object.values(CLINICAL_COPY),
    ];
    for (const key of keys) expect(copy.es).toHaveProperty(key);
  });
});

describe('Options sheet (Home "..." menu)', () => {
  beforeEach(() => {
    stubReducedMotion(false);
  });

  it('offers the four rows, with delete disabled when the record is empty', () => {
    renderWithI18n(<OptionsSheet open onOpenChange={vi.fn()} hasContent={false} {...handlers()} />);
    const dialog = screen.getByRole('dialog', { name: 'Opciones' });
    expect(within(dialog).getByRole('button', { name: /Alcance del prototipo/ })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: /Guía y privacidad/ })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: /Idioma/ })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: /Borrar examen/ })).toBeDisabled();
  });

  it('enables delete when the record has content and calls the handler', async () => {
    const actions = handlers();
    renderWithI18n(<OptionsSheet open onOpenChange={vi.fn()} hasContent {...actions} />);
    await userEvent.click(screen.getByRole('button', { name: /Borrar examen/ }));
    expect(actions.onDelete).toHaveBeenCalledTimes(1);
  });

  it('routes the scope and guide rows to their handlers', async () => {
    const actions = handlers();
    renderWithI18n(<OptionsSheet open onOpenChange={vi.fn()} hasContent={false} {...actions} />);
    await userEvent.click(screen.getByRole('button', { name: /Alcance del prototipo/ }));
    await userEvent.click(screen.getByRole('button', { name: /Guía y privacidad/ }));
    expect(actions.onScope).toHaveBeenCalledTimes(1);
    expect(actions.onGuide).toHaveBeenCalledTimes(1);
  });

  it('shows the current language and switches it, persisting the choice', async () => {
    const storage = memoryStorage();
    renderWithI18n(<OptionsSheet open onOpenChange={vi.fn()} hasContent={false} {...handlers()} />, storage);
    const language = screen.getByRole('button', { name: /Idioma/ });
    expect(language).toHaveTextContent('Español');
    await userEvent.click(language);
    expect(storage.setItem).toHaveBeenCalledWith(LOCALE_STORAGE_KEY, 'en');
  });
});

describe('Home "..." trigger', () => {
  beforeEach(() => {
    stubReducedMotion(true);
  });

  it('is enabled on an empty record, opens the options sheet and returns focus on close', async () => {
    const store = createExamStore(createInitialState(clock), clock);
    render(
      <I18nProvider dictionary={copyRegistry} storage={memoryStorage()} navigatorLanguage="es-CO">
        <ExamProvider store={store}>
          <Router routes={[]} fallback={Home} />
        </ExamProvider>
      </I18nProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'Opciones' });
    expect(trigger).toBeEnabled();

    await userEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Opciones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Borrar examen/ })).toBeDisabled();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

describe('ClinicalContextForm', () => {
  beforeEach(() => {
    stubReducedMotion(false);
  });

  it('blocks saving an age outside 0-120 and explains why', async () => {
    renderWithI18n(<ClinicalContextForm initial={undefined} onSave={vi.fn()} onCancel={vi.fn()} />);
    const age = screen.getByLabelText('Edad');
    await userEvent.type(age, '121');
    expect(age).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Ingrese una edad entera entre 0 y 120.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('saves only the fields the user filled in', async () => {
    const onSave = vi.fn();
    renderWithI18n(<ClinicalContextForm initial={undefined} onSave={onSave} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Edad'), '54');
    await userEvent.click(screen.getByLabelText('1-6 meses'));
    await userEvent.click(screen.getByRole('button', { name: 'Picazón' }));
    await userEvent.type(screen.getByLabelText('Antecedentes'), 'nevo congénito');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onSave).toHaveBeenCalledWith({
      ageYears: 54,
      duration: '1to6m',
      symptoms: ['itch'],
      history: 'nevo congénito',
    });
  });

  it('caps the history at 500 characters with a visible counter', async () => {
    renderWithI18n(<ClinicalContextForm initial={undefined} onSave={vi.fn()} onCancel={vi.fn()} />);
    const history = screen.getByLabelText('Antecedentes');
    expect(history).toHaveAttribute('maxlength', '500');
    await userEvent.type(history, 'abc');
    expect(screen.getByText('3/500')).toBeInTheDocument();
  });

  it('cancels without saving', async () => {
    const onCancel = vi.fn();
    const onSave = vi.fn();
    renderWithI18n(<ClinicalContextForm initial={undefined} onSave={onSave} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
