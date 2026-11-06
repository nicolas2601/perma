import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tile } from '../../../src/ui/Tile';

describe('Tile', () => {
  it('renders a tinted bento tile with a heading, body and decorative icon', () => {
    const { container } = render(
      <Tile tint="mint" icon={<svg data-testid="tile-icon" />} title="Prepare una imagen." body="Registre el contexto." />,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Prepare una imagen.' })).toBeInTheDocument();
    expect(screen.getByText('Registre el contexto.')).toBeInTheDocument();
    expect(container.querySelector('[data-variant="soft"]')).toHaveAttribute('data-tint', 'mint');
    expect(container.querySelector('[aria-hidden="true"]')).toContainElement(screen.getByTestId('tile-icon'));
  });
});
