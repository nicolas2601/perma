import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionHeading } from '../../../src/ui/SectionHeading';

describe('SectionHeading', () => {
  it('renders the title as a heading with the eyebrow as plain text', () => {
    render(<SectionHeading eyebrow="Paso 2" title="Imagen" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Imagen' })).toBeInTheDocument();
    expect(screen.getByText('Paso 2')).toBeInTheDocument();
  });

  it('keeps the geometric accent decorative', () => {
    const { container } = render(<SectionHeading title="Resultado" tint="lilac" />);

    const accent = container.querySelector('svg');
    expect(accent).toHaveAttribute('aria-hidden', 'true');
    expect(accent?.getAttribute('class')).toContain('text-deep-lilac');
  });

  it('allows a level 3 heading inside a nested region', () => {
    render(<SectionHeading title="Notas" as="h3" />);

    expect(screen.getByRole('heading', { level: 3, name: 'Notas' })).toBeInTheDocument();
  });
});
