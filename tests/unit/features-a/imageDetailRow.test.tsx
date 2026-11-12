import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ImageDetailRow } from '../../../src/features/recovery/ImageDetailRow';

describe('ImageDetailRow', () => {
  it('starts collapsed and reveals only the record file name on demand', async () => {
    render(<ImageDetailRow title="Revisar la imagen" hint="Abrir detalles" fileLabel="Archivo" fileName="lesion.jpg" />);
    const toggle = screen.getByRole('button', { name: /Revisar la imagen/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Archivo: lesion.jpg')).toBeNull();
    await userEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Archivo: lesion.jpg')).toBeTruthy();
  });
});
