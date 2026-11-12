import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IconBlob } from '../../../src/ui/IconBlob';

describe('IconBlob', () => {
  it('is decorative by default and hides the icon slot from assistive tech', () => {
    const { container } = render(
      <IconBlob tint="butter">
        <svg data-testid="icon" />
      </IconBlob>,
    );

    const blob = container.firstElementChild;
    expect(blob).toHaveAttribute('aria-hidden', 'true');
    expect(blob).toHaveAttribute('data-tint', 'butter');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('exposes a label as an image when the blob carries meaning', () => {
    render(
      <IconBlob tint="sky" label="Contexto">
        <svg />
      </IconBlob>,
    );

    expect(screen.getByRole('img', { name: 'Contexto' })).toBeInTheDocument();
  });

  it('surface tone keeps the blob visible on a tinted card, with the icon in the deep tone', () => {
    const { container } = render(
      <IconBlob tint="sky" tone="surface">
        <svg />
      </IconBlob>,
    );

    const blob = container.firstElementChild;
    expect(blob?.className).toContain('bg-surface');
    expect(blob?.className).toContain('text-deep-sky');
    expect(blob?.className).not.toContain('bg-tint-sky');
  });

  it('supports exactly the 40 and 48 px sizes', () => {
    const { rerender, container } = render(
      <IconBlob tint="mint" size={40}>
        <svg />
      </IconBlob>,
    );
    expect(container.firstElementChild?.className).toContain('size-10');

    rerender(
      <IconBlob tint="mint" size={48}>
        <svg />
      </IconBlob>,
    );
    expect(container.firstElementChild?.className).toContain('size-12');
  });
});
