import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScoreRow, formatRawScore } from '../../../src/ui/ScoreRow';
import { InvalidScoreError, toRawScore } from '../../../src/ui/score';

describe('ScoreRow', () => {
  it('exposes the raw score as a meter with Spanish decimal text and no percentage', () => {
    render(<ScoreRow label="Puntaje 2" score={0.47} locale="es" />);

    const meter = screen.getByRole('meter', { name: 'Puntaje 2' });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '1');
    expect(meter).toHaveAttribute('aria-valuenow', '0.47');
    expect(meter).toHaveAttribute('aria-valuetext', '0,47');
    expect(screen.getByText('0,47')).toBeInTheDocument();
    expect(document.body.textContent ?? '').not.toContain('%');
  });

  it('formats with English decimals for the EN locale', () => {
    render(<ScoreRow label="Score 1" score={0.12} locale="en" />);

    expect(screen.getByRole('meter', { name: 'Score 1' })).toHaveAttribute('aria-valuetext', '0.12');
  });

  it('rejects scores outside the raw 0-1 scale with a typed error', () => {
    expect(() => toRawScore(1.2)).toThrow(InvalidScoreError);
    expect(() => toRawScore(-0.01)).toThrow(InvalidScoreError);
    expect(() => toRawScore(Number.NaN)).toThrow(InvalidScoreError);
    expect(toRawScore(0)).toBe(0);
    expect(toRawScore(1)).toBe(1);
  });

  it('formats scores with exactly two decimals per locale', () => {
    expect(formatRawScore(0.5, 'es')).toBe('0,50');
    expect(formatRawScore(1, 'en')).toBe('1.00');
  });
});
