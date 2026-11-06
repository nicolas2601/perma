import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AbcdeRow } from '@/features/abcde/AbcdeRow';

function row(open: boolean, onToggle = vi.fn()) {
  return (
    <AbcdeRow id="abcde-a" letter="A" title="Asimetría" status="Sin evaluar" open={open} onToggle={onToggle}>
      <p>cuerpo</p>
    </AbcdeRow>
  );
}

describe('AbcdeRow', () => {
  it('shows the recorded value as a neutral chip while collapsed', () => {
    render(row(false));
    const trigger = screen.getByRole('button', { name: /Asimetría/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('Sin evaluar');
    expect(trigger.querySelector('[data-tint="neutral"]')?.textContent).toBe('Sin evaluar');
  });

  it('reports expanded state and toggles through onToggle', async () => {
    const onToggle = vi.fn();
    render(row(true, onToggle));
    const trigger = screen.getByRole('button', { name: /Asimetría/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await userEvent.click(trigger);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('keeps a closed body inert so its options are unreachable', () => {
    const { container } = render(row(false));
    expect(container.querySelector('[role="region"]')?.hasAttribute('inert')).toBe(true);
  });
});
