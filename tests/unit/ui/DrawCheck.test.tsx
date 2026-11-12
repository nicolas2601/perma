import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DrawCheck } from '../../../src/ui/DrawCheck';

describe('DrawCheck', () => {
  it('is decorative by default', () => {
    const { container } = render(<DrawCheck />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes a label as an image when it confirms an outcome', () => {
    render(<DrawCheck label="Exportación completada" />);

    expect(screen.getByRole('img', { name: 'Exportación completada' })).toBeInTheDocument();
  });

  it('draws once and only under motion-safe, so reduced motion shows the static check', () => {
    const { container } = render(<DrawCheck />);

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toContain('motion-safe:animate-(--animate-perma-draw-check)');
    expect(svg?.getAttribute('class')).not.toMatch(/(^|\s)animate-/);
    const path = container.querySelector('path');
    expect(path).toHaveAttribute('pathLength', '1');
    expect(path).toHaveAttribute('stroke-dasharray', '1 1');
  });
});
