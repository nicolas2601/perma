import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from '../../../src/ui/Chip';

describe('Chip', () => {
  it('renders a static tinted label without button semantics', () => {
    render(<Chip tint="sky">Contexto</Chip>);

    expect(screen.queryByRole('button')).toBeNull();
    const chip = screen.getByText('Contexto');
    expect(chip).toHaveAttribute('data-tint', 'sky');
    expect(chip.className).not.toContain('min-h-11');
  });

  it('interactive chip is a real button with a 44 px minimum target and fires onClick', async () => {
    const onClick = vi.fn();
    render(
      <Chip tint="mint" onClick={onClick}>
        Imagen
      </Chip>,
    );

    const button = screen.getByRole('button', { name: 'Imagen' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button.className).toContain('min-h-11');
    expect(button.className).toContain('min-w-11');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('exposes selection through aria-pressed on interactive chips', () => {
    render(
      <Chip tint="lilac" selected onClick={() => undefined}>
        Resultado
      </Chip>,
    );

    expect(screen.getByRole('button', { name: 'Resultado' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('neutral tint uses the subtle surface instead of a named tint', () => {
    render(<Chip>Revisión</Chip>);

    expect(screen.getByText('Revisión')).toHaveAttribute('data-tint', 'neutral');
  });
});
