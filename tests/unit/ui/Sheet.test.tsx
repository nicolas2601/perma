import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sheet } from '../../../src/ui/Sheet';
import { stubReducedMotion } from './support';

function renderSheet(open: boolean, onOpenChange = vi.fn()) {
  return render(
    <Sheet open={open} onOpenChange={onOpenChange} title="Sitio del cuerpo" closeLabel="Cerrar hoja">
      <p>Elija una ubicación general.</p>
    </Sheet>,
  );
}

describe('Sheet', () => {
  beforeEach(() => {
    stubReducedMotion(false);
  });

  it('renders nothing while closed', () => {
    renderSheet(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens as a named modal dialog with its body', () => {
    renderSheet(true);

    const dialog = screen.getByRole('dialog', { name: 'Sitio del cuerpo' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Elija una ubicación general.')).toBeInTheDocument();
  });

  it('Escape requests close', async () => {
    const onOpenChange = vi.fn();
    renderSheet(true, onOpenChange);

    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Escape returns focus to the control that opened the sheet', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir hoja
          </button>
          <Sheet open={open} onOpenChange={setOpen} title="Sitio del cuerpo" closeLabel="Cerrar hoja">
            <p>Contenido</p>
          </Sheet>
        </>
      );
    }
    render(<Harness />);

    const opener = screen.getByRole('button', { name: 'Abrir hoja' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Sitio del cuerpo' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('icon close button has an accessible name and requests close', async () => {
    const onOpenChange = vi.fn();
    renderSheet(true, onOpenChange);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar hoja' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
