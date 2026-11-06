import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Stepper, type StepDef } from '../../../src/ui/Stepper';

const STEPS: readonly StepDef[] = [
  { id: 'contexto', label: 'Contexto', tint: 'sky' },
  { id: 'imagen', label: 'Imagen', tint: 'mint' },
  { id: 'analisis', label: 'Análisis', tint: 'butter' },
  { id: 'resultado', label: 'Resultado', tint: 'lilac' },
  { id: 'observaciones', label: 'Observaciones', tint: 'blush' },
  { id: 'revision', label: 'Revisión' },
];

describe('Stepper', () => {
  it('is a named navigation landmark containing an ordered list of six steps', () => {
    render(<Stepper steps={STEPS} currentId="analisis" label="Recorrido" />);

    const nav = screen.getByRole('navigation', { name: 'Recorrido' });
    const list = within(nav).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
  });

  it('marks only the current step with aria-current="step"', () => {
    render(<Stepper steps={STEPS} currentId="analisis" label="Recorrido" />);

    const current = screen.getAllByRole('listitem').filter((item) => item.getAttribute('aria-current') === 'step');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Análisis');
  });

  it('highlights the current step with its tint and keeps other steps as dots with accessible names', () => {
    render(<Stepper steps={STEPS} currentId="resultado" label="Recorrido" />);

    const current = screen.getByText('Resultado');
    expect(current.closest('[data-tint]')).toHaveAttribute('data-tint', 'lilac');
    expect(screen.getByText('Contexto')).toHaveClass('sr-only');
  });

  it('calls onSelect for any step, including ones ahead of or behind the current step', async () => {
    const onSelect = vi.fn();
    render(<Stepper steps={STEPS} currentId="contexto" label="Recorrido" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: 'Revisión' }));
    await userEvent.click(screen.getByRole('button', { name: 'Imagen' }));
    expect(onSelect).toHaveBeenNthCalledWith(1, 'revision');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'imagen');
  });

  it('renders no buttons when the stepper is informational only', () => {
    render(<Stepper steps={STEPS} currentId="imagen" label="Recorrido" />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('gives every interactive step a 44 px hit area', () => {
    render(<Stepper steps={STEPS} currentId="imagen" label="Recorrido" onSelect={() => undefined} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('min-h-11');
      expect(button.className).toContain('min-w-11');
    }
  });
});
