import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from '../../../src/ui/EmptyState';
import { Button } from '../../../src/ui/Button';

describe('EmptyState', () => {
  it('renders title, body and an action, with the illustration hidden from assistive tech', async () => {
    const onAction = vi.fn();
    const { container } = render(
      <EmptyState
        art={<svg data-testid="art" />}
        title="Todavía no hay imágenes."
        body="Cargue una imagen para empezar."
        action={<Button onClick={onAction}>Cargar imagen</Button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Todavía no hay imágenes.' })).toBeInTheDocument();
    expect(screen.getByText('Cargue una imagen para empezar.')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toContainElement(screen.getByTestId('art'));

    await userEvent.click(screen.getByRole('button', { name: 'Cargar imagen' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('works without art or action and honors the requested heading level', () => {
    render(<EmptyState title="Sin resultados" titleAs="h3" />);

    expect(screen.getByRole('heading', { level: 3, name: 'Sin resultados' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
