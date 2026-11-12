import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Router } from '@/app/router';
import { ActionRow } from '@/features/inspect/ActionRow';

const ICON = <span data-testid="row-icon" />;

function renderWithRouter(ui: React.ReactElement) {
  return render(<Router routes={[]} fallback={() => ui} />);
}

describe('ActionRow', () => {
  it('renders a button that keeps the grid layout (never flex-col on a button, WebKit)', () => {
    const onClick = vi.fn();
    render(<ActionRow tint="lilac" icon={ICON} title="Modelo y procedencia" hint="Abrir detalles" onClick={onClick} />);
    const button = screen.getByRole('button', { name: /Modelo y procedencia/ });
    expect(button.className).toContain('grid');
    expect(button.className).not.toContain('flex-col');
    expect(button.className).toContain('min-h-14');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('calls onClick when the row is tapped', async () => {
    const onClick = vi.fn();
    render(<ActionRow tint="blush" icon={ICON} title="Capas" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Capas' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a link when a destination is given and hides the chevron from assistive tech', () => {
    renderWithRouter(<ActionRow tint="lilac" icon={ICON} title="Ver las siete categorías" hint="Abrir detalles" to="/resultado/clases" />);
    const link = screen.getByRole('link', { name: /Ver las siete categorías/ });
    expect(link.getAttribute('href')).toBe('/resultado/clases');
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('marks the card with its variant and tint so identity is carried by the kit, not by ad-hoc classes', () => {
    const { container } = render(<ActionRow tint="sky" variant="raised" icon={ICON} title="Privacidad" onClick={() => undefined} />);
    const card = container.querySelector('[data-variant="raised"]');
    expect(card).not.toBeNull();
    expect(card?.getAttribute('data-tint')).toBeNull();
  });
});
