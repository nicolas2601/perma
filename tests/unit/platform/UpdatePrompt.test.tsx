import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdatePrompt } from '../../../src/app/pwa/UpdatePrompt';
import type { AppUpdate } from '../../../src/app/pwa/useAppUpdate';
import type { UpdatePhase } from '../../../src/app/pwa/updateState';

const hook = vi.hoisted(() => ({ current: null as AppUpdate | null, lastCanReload: null as boolean | null }));

vi.mock('../../../src/app/pwa/useAppUpdate', () => ({
  useAppUpdate: ({ canReload }: { canReload: boolean }) => {
    hook.lastCanReload = canReload;
    return hook.current;
  },
}));

function setPhase(phase: UpdatePhase): { applyUpdate: ReturnType<typeof vi.fn>; dismissUpdate: ReturnType<typeof vi.fn>; dismissOffline: ReturnType<typeof vi.fn> } {
  const applyUpdate = vi.fn();
  const dismissUpdate = vi.fn();
  const dismissOffline = vi.fn();
  hook.current = { phase, applyUpdate, dismissUpdate, dismissOffline };
  return { applyUpdate, dismissUpdate, dismissOffline };
}

describe('UpdatePrompt', () => {
  beforeEach(() => {
    hook.current = null;
    hook.lastCanReload = null;
  });

  it('renders nothing when hidden', () => {
    setPhase('hidden');
    const { container } = render(<UpdatePrompt canReload />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tells the user the shell works offline and that inference needs the network', () => {
    setPhase('offline-ready');
    render(<UpdatePrompt canReload />);

    expect(screen.getByRole('status')).toHaveAttribute('data-phase', 'offline-ready');
    expect(screen.getByText(/requiere conexión a la red/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument();
  });

  it('keeps the update button disabled and explains why while a review is open', () => {
    setPhase('update-blocked');
    render(<UpdatePrompt canReload={false} />);

    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    expect(screen.getByText(/Podrá actualizar cuando termine/)).toBeInTheDocument();
    expect(hook.lastCanReload).toBe(false);
  });

  it('applies the update on click when reload is allowed', async () => {
    const { applyUpdate } = setPhase('update-ready');
    render(<UpdatePrompt canReload />);

    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('lets the user postpone the update without applying it', async () => {
    const { applyUpdate, dismissUpdate } = setPhase('update-ready');
    render(<UpdatePrompt canReload />);

    await userEvent.click(screen.getByRole('button', { name: 'Más tarde' }));
    expect(dismissUpdate).toHaveBeenCalledTimes(1);
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it('renders English copy when the locale is en', () => {
    setPhase('update-ready');
    render(<UpdatePrompt canReload locale="en" />);

    expect(screen.getByText('A new version of VERA is available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled();
  });
});
