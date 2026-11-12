import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExportDoneArt } from '@/features/review/ExportDoneArt';

describe('ExportDoneArt', () => {
  it('inlines the export-done art with the draw-on class on the root svg only', () => {
    const { container } = render(<ExportDoneArt />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('class')).toBe('ill-animate');
    expect(container.querySelectorAll('.ill-animate')).toHaveLength(1);
    expect(svg?.querySelector('.ill-check')).not.toBeNull();
  });

  it('is decorative for assistive tech because the heading already states the outcome', () => {
    const { container } = render(<ExportDoneArt />);
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps reduced-motion handling in the art itself so the finished check shows without the class', () => {
    const { container } = render(<ExportDoneArt />);
    const style = container.querySelector('style')?.textContent ?? '';
    expect(style).toContain('prefers-reduced-motion: reduce');
  });
});
