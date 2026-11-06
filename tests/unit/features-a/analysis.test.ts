import { afterEach, describe, expect, it } from 'vitest';
import { InferenceError, type RecoveryScenario } from '@/core/inference/types';
import {
  beginAnalysis,
  finishAnalysis,
  isAnalysisInFlight,
  scenarioOfFailure,
  stopAnalysis,
} from '@/features/consent/analysis';

describe('scenarioOfFailure', () => {
  it.each<RecoveryScenario>(['offline', 'server-error', 'timeout', 'invalid-response', 'rate-limit'])(
    'keeps the typed %s failure',
    (scenario) => {
      expect(scenarioOfFailure(new InferenceError(scenario, 'x'))).toBe(scenario);
    },
  );

  it('reports untyped failures as an unavailable service, never as a guess', () => {
    expect(scenarioOfFailure(new Error('boom'))).toBe('server-error');
  });

  it('reports a scenario the processing state cannot enter as an unavailable service', () => {
    expect(scenarioOfFailure(new InferenceError('permission', 'x'))).toBe('server-error');
  });
});

describe('single-flight analysis (G2)', () => {
  afterEach(() => stopAnalysis());

  it('allows one request at a time and frees the slot when finished', () => {
    const first = beginAnalysis();
    expect(first).not.toBeNull();
    expect(beginAnalysis()).toBeNull();
    expect(isAnalysisInFlight()).toBe(true);
    if (first) finishAnalysis(first);
    expect(isAnalysisInFlight()).toBe(false);
    expect(beginAnalysis()).not.toBeNull();
  });

  it('aborts the pending request on stop and clears the slot', () => {
    const controller = beginAnalysis();
    expect(controller).not.toBeNull();
    stopAnalysis();
    expect(controller?.signal.aborted).toBe(true);
    expect(isAnalysisInFlight()).toBe(false);
  });

  it('a stale finish never clears a newer request', () => {
    const stale = beginAnalysis();
    stopAnalysis();
    const fresh = beginAnalysis();
    if (stale) finishAnalysis(stale);
    expect(isAnalysisInFlight()).toBe(true);
    if (fresh) finishAnalysis(fresh);
  });
});
