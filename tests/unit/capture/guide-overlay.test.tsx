import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { GuideOverlay } from '@/features/camera/guide/GuideOverlay';
import { copy } from '@/features/camera/guide/copy';
import { useCaptureAdvice } from '@/features/camera/guide/useCaptureAdvice';
import type { CaptureAdvisorOptions } from '@/core/capture/create-capture-advisor';
import type { FrameScheduler, SampleCanvas } from '@/core/capture/frame-sampler';
import type { WorkerPort } from '@/core/capture/worker-client';
import type { Advice } from '@/core/capture/types';
import { createRef } from 'react';

/** Claims the guide must never make: detection of blur, or approval of the image. Hedged wording is fine. */
const FORBIDDEN = /detectad|detected|aprobad|approved|calidad (?:buena|aprobada)|quality (?:is )?(?:approved|good)/i;
const OK_STATUS = { focus: 'ok', light: 'ok', distance: 'ok' } as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('feature copy', () => {
  it('has identical keys in es and en', () => {
    expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  });

  it('never says blur was detected or that quality was approved', () => {
    for (const table of [copy.es, copy.en]) {
      for (const value of Object.values(table)) expect(value).not.toMatch(FORBIDDEN);
    }
  });

  it('hedges the focus line ("parece"): it never states that blur was detected', () => {
    expect(copy.es['advice.check-focus']).toMatch(/parece/i);
    expect(copy.en['advice.check-focus']).toMatch(/looks/i);
  });

  it('has one line for every advice id that can be shown', () => {
    const ids = ['less-light', 'more-light', 'avoid-glare', 'hold-still', 'closer', 'farther', 'center-area', 'check-focus'] as const;
    for (const id of ids) expect(copy.es[`advice.${id}`]).toBeTruthy();
    for (const id of ids) expect(copy.en[`advice.${id}`]).toBeTruthy();
  });
});

describe('GuideOverlay', () => {
  const automatic = (id: Advice['id'], status = OK_STATUS): Advice => ({ id, abstained: false, mode: 'automatic', status });

  it('renders the Spanish advice line by default locale', () => {
    render(<GuideOverlay advice={automatic('more-light')} locale="es" />);
    expect(screen.getByRole('status')).toHaveTextContent('Busque más luz');
  });

  it('renders the English advice line for en', () => {
    render(<GuideOverlay advice={automatic('avoid-glare')} locale="en" />);
    expect(screen.getByRole('status')).toHaveTextContent('Avoid the reflection');
  });

  it('announces politely through a live region', () => {
    render(<GuideOverlay advice={automatic('closer')} locale="en" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the static manual line when the pipeline degraded', () => {
    render(<GuideOverlay advice={{ id: 'none', abstained: false, mode: 'manual', status: { focus: 'sin-dato', light: 'sin-dato', distance: 'sin-dato' } }} locale="en" />);
    expect(screen.getByRole('status')).toHaveTextContent(copy.en['guide.manual']);
  });

  it('hides the line (opacity) when there is no advice', () => {
    render(<GuideOverlay advice={automatic('none')} locale="es" />);
    expect(screen.getByRole('status').className).toContain('opacity-0');
  });

  it('transitions only transform and opacity, and respects reduced motion', () => {
    render(<GuideOverlay advice={automatic('closer')} locale="es" />);
    const className = screen.getByRole('status').className;
    expect(className).toContain('transition-[opacity,transform]');
    expect(className).toContain('motion-reduce:transition-opacity');
    expect(className).not.toMatch(/transition-all|transition-\[all/);
  });

  it('never gates the capture control: children stay enabled whatever the advice', () => {
    render(
      <GuideOverlay advice={automatic('check-focus')} locale="es">
        <button type="button">Capturar</button>
      </GuideOverlay>,
    );
    expect(screen.getByRole('button', { name: 'Capturar' })).toBeEnabled();
  });

  it('draws a square guide crop', () => {
    render(<GuideOverlay advice={null} locale="es" />);
    expect(screen.getByTestId('guide-crop')).toHaveStyle({ width: '72%' });
    expect(screen.getByTestId('guide-crop')).toHaveAttribute('aria-hidden', 'true');
  });

  it('vibrates on a new advice only when the user enabled it', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const { rerender } = render(<GuideOverlay advice={automatic('closer')} locale="es" vibrate={false} />);
    rerender(<GuideOverlay advice={automatic('center-area')} locale="es" vibrate={false} />);
    expect(vibrate).not.toHaveBeenCalled();
    rerender(<GuideOverlay advice={automatic('hold-still')} locale="es" vibrate />);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });

  it('does not vibrate for the same advice repeated', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const { rerender } = render(<GuideOverlay advice={automatic('closer')} locale="es" vibrate />);
    rerender(<GuideOverlay advice={automatic('closer')} locale="es" vibrate />);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});

describe('GuideOverlay status chips', () => {
  const chipOf = (key: string) => document.querySelector(`[data-chip="${key}"]`);

  it('renders three chips with a state word each (icon and text, not colour alone)', () => {
    render(<GuideOverlay advice={{ id: 'check-focus', abstained: false, mode: 'automatic', status: { focus: 'revisar', light: 'ok', distance: 'sin-dato' } }} locale="es" />);
    expect(chipOf('focus')).toHaveTextContent('Enfoque: Revisar');
    expect(chipOf('light')).toHaveTextContent('Luz: Sin alerta');
    expect(chipOf('distance')).toHaveTextContent('Distancia: Sin dato');
    expect(chipOf('focus')?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows no data on every chip before the first advice', () => {
    render(<GuideOverlay advice={null} locale="en" />);
    for (const key of ['focus', 'light', 'distance']) expect(chipOf(key)).toHaveAttribute('data-state', 'sin-dato');
  });

  it('chips are not live regions: only the advice sentence announces', () => {
    render(<GuideOverlay advice={{ id: 'closer', abstained: false, mode: 'automatic', status: OK_STATUS }} locale="en" />);
    const live = document.querySelectorAll('[aria-live]');
    expect(live).toHaveLength(1);
    expect(live[0]).toBe(screen.getByRole('status'));
  });
});

describe('useCaptureAdvice', () => {
  /** Fakes that never answer: the hook only has to start and stop the advisor. */
  function fakeOptions() {
    const stop = vi.fn();
    const worker: WorkerPort = { postMessage: () => undefined, onMessage: () => undefined, terminate: () => undefined };
    const scheduler: FrameScheduler = { start: () => undefined, stop };
    const canvas: SampleCanvas = { drawImage: () => undefined, readRgba: () => null };
    const options: Partial<CaptureAdvisorOptions> = {
      createWorker: () => worker,
      createScheduler: () => scheduler,
      createSampleCanvas: () => canvas,
      loadBlurHead: () => new Promise(() => undefined),
    };
    return { options, stop };
  }

  it('starts with no advice', () => {
    const ref = { current: { videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement };
    const { result } = renderHook(() => useCaptureAdvice(ref, fakeOptions().options));
    expect(result.current).toBeNull();
  });

  it('does nothing when the video element is not mounted', () => {
    const ref = createRef<HTMLVideoElement>() as { current: HTMLVideoElement | null };
    const fake = fakeOptions();
    const { result } = renderHook(() => useCaptureAdvice(ref, fake.options));
    expect(result.current).toBeNull();
    expect(fake.stop).not.toHaveBeenCalled();
  });

  it('stops the advisor on unmount', () => {
    const ref = { current: { videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement };
    const fake = fakeOptions();
    const { unmount } = renderHook(() => useCaptureAdvice(ref, fake.options));
    act(() => unmount());
    expect(fake.stop).toHaveBeenCalledTimes(1);
  });
});
