import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '../../../src/ui/Card';

describe('Card variants', () => {
  it('keeps the legacy tone rendering when no variant is given', () => {
    render(<Card tone="subtle">Legacy</Card>);

    const card = screen.getByText('Legacy');
    expect(card).toHaveAttribute('data-tone', 'subtle');
    expect(card).not.toHaveAttribute('data-variant');
  });

  it('outline uses the soft-line 1 px border, not a heavy outline', () => {
    render(<Card variant="outline">Outline</Card>);

    const card = screen.getByText('Outline');
    expect(card).toHaveAttribute('data-variant', 'outline');
    expect(card.className).toContain('border-soft-line');
    expect(card.className).toContain('rounded-card');
  });

  it('soft variant uses the requested tint background with no border', () => {
    render(
      <Card variant="soft" tint="sky">
        Soft
      </Card>,
    );

    const card = screen.getByText('Soft');
    expect(card.className).toContain('bg-tint-sky');
    expect(card.className).not.toContain('border-line');
  });

  it('soft variant without a tint falls back to the neutral subtle surface', () => {
    render(<Card variant="soft">Neutral soft</Card>);

    expect(screen.getByText('Neutral soft').className).toContain('bg-subtle');
  });

  it('raised variant adds the layered soft shadow', () => {
    render(<Card variant="raised">Raised</Card>);

    expect(screen.getByText('Raised').className).toContain('shadow-raised');
  });

  it('interactive card presses to 0.98 with a 140 ms transform-only transition', () => {
    render(
      <Card variant="raised" as="button" interactive>
        Pressable
      </Card>,
    );

    const button = screen.getByRole('button', { name: 'Pressable' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button.className).toContain('transition-transform');
    expect(button.className).toContain('duration-(--motion-card)');
    expect(button.className).toContain('active:scale-[0.98]');
    expect(button.className).toContain('fine-hover:shadow-raised');
    expect(button.className).not.toContain('transition-all');
  });

  it('interactive card under reduced motion drops the scale in favor of a small opacity change', () => {
    render(
      <Card variant="raised" as="button" interactive>
        Reduced
      </Card>,
    );

    const className = screen.getByRole('button', { name: 'Reduced' }).className;
    expect(className).toContain('motion-reduce:active:scale-100');
    expect(className).toContain('motion-reduce:active:opacity-90');
  });

  it('static cards carry no press affordance', () => {
    render(<Card variant="outline">Static</Card>);

    expect(screen.getByText('Static').className).not.toContain('active:scale');
  });
});
