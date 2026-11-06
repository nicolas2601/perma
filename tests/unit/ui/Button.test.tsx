import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../../../src/ui/Button';
import { stubReducedMotion } from './support';

describe('Button', () => {
  beforeEach(() => {
    stubReducedMotion(false);
  });

  it('renders the variant as a real button and fires onClick', async () => {
    const onClick = vi.fn();
    render(
      <Button variant="danger" onClick={onClick}>
        Intentar de nuevo
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Intentar de nuevo' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-variant', 'danger');

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disabled blocks activation and exposes the native disabled state', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        No disponible
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'No disponible' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading keeps the label, marks aria-busy and blocks repeated activation', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Enviar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Enviar' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('data-loading', 'true');

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('pressed specimen exposes data-pressed without changing the accessible name', () => {
    render(<Button pressed>Revisar</Button>);

    const button = screen.getByRole('button', { name: 'Revisar' });
    expect(button).toHaveAttribute('data-pressed', 'true');
  });
});
