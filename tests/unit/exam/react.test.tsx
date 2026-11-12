import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExamProvider, useExam, useExamDispatch } from '@/core/exam/react';
import { createInitialState } from '@/core/exam/state';
import { createExamStore } from '@/core/exam/store';
import { fixedClock } from './fixtures';

const clock = fixedClock();

function PhaseProbe() {
  const phase = useExam((state) => state.phase);
  const dispatch = useExamDispatch();
  return (
    <div>
      <span data-testid="phase">{phase}</span>
      <button type="button" onClick={() => dispatch({ type: 'SET_SITE', site: 'hombro' })}>
        site
      </button>
    </div>
  );
}

describe('exam store', () => {
  it('notifies subscribers only when a command changes state', () => {
    const store = createExamStore(createInitialState(clock), clock);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.dispatch({ type: 'SET_SITE', site: 'hombro' });
    store.dispatch({ type: 'SET_SITE', site: 'hombro' });
    store.dispatch({ type: 'SEND' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().phase).toBe('contextSet');
    unsubscribe();
    store.dispatch({ type: 'SET_SITE', site: 'codo' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('replaces the state on hydrate and notifies', () => {
    const store = createExamStore(createInitialState(clock), clock);
    const listener = vi.fn();
    store.subscribe(listener);
    const hydrated = { ...createInitialState(clock), phase: 'contextSet' as const };
    store.hydrate(hydrated);
    expect(store.getState()).toBe(hydrated);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('exam hooks', () => {
  it('re-renders the selected slice when a dispatch changes it', () => {
    const store = createExamStore(createInitialState(clock), clock);
    render(
      <ExamProvider store={store}>
        <PhaseProbe />
      </ExamProvider>,
    );
    expect(screen.getByTestId('phase').textContent).toBe('idle');

    act(() => {
      screen.getByRole('button', { name: 'site' }).click();
    });

    expect(screen.getByTestId('phase').textContent).toBe('contextSet');
  });

  it('throws a clear error when used outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<PhaseProbe />)).toThrow('useExam must be used inside <ExamProvider>');
    consoleError.mockRestore();
  });
});
