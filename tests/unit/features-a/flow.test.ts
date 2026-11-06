import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/core/exam/state';
import { createExamStore } from '@/core/exam/store';
import { systemClock } from '@/core/exam/clock';
import type { ExamImage } from '@/core/exam/contract';
import type { InferenceResult } from '@/core/inference/types';

/** The exact command sequence the Features-A screens dispatch, checked against the real reducer. */

const image: ExamImage = {
  original: new Blob(['original'], { type: 'image/jpeg' }),
  upload: new Blob(['upload'], { type: 'image/jpeg' }),
  name: 'sample.jpg',
  origin: 'sample',
};

const result: InferenceResult = {
  source: 'mock',
  model: 'B71',
  mode: 'base',
  identity: { modelId: 'simulated-B71', sha256: null, sha256Verified: false, recipe: 'simulated', release: null },
  scores: { akiec: 0.1, bcc: 0.1, bkl: 0.1, df: 0.1, mel: 0.1, nv: 0.4, vasc: 0.1 },
  latencyMs: 0,
  warnings: ['simulated-model'],
};

function startStore() {
  return createExamStore(createInitialState(systemClock), systemClock);
}

describe('Features-A command flow', () => {
  it('runs context, capture, review, consent and send to a stored result', () => {
    const store = startStore();
    store.dispatch({ type: 'SET_SITE', site: 'face' });
    store.dispatch({ type: 'START_CAPTURE' });
    store.dispatch({ type: 'IMAGE_LOADED', image });
    store.dispatch({ type: 'CONFIRM_IMAGE' });
    store.dispatch({ type: 'CONSENT', value: true });
    store.dispatch({ type: 'SEND' });
    expect(store.getState().phase).toBe('processing');
    store.dispatch({ type: 'RESULT_OK', result });
    expect(store.getState().phase).toBe('result');
    expect(store.getState().result).toBe(result);
  });

  it('a failure enters the matching recovery and RECOVER retry returns to consent with the image kept', () => {
    const store = startStore();
    store.dispatch({ type: 'SET_SITE', site: 'face' });
    store.dispatch({ type: 'START_CAPTURE' });
    store.dispatch({ type: 'IMAGE_LOADED', image });
    store.dispatch({ type: 'CONFIRM_IMAGE' });
    store.dispatch({ type: 'CONSENT', value: true });
    store.dispatch({ type: 'SEND' });
    store.dispatch({ type: 'FAULT', scenario: 'timeout' });
    expect(store.getState().phase).toBe('recover:timeout');
    store.dispatch({ type: 'RECOVER', scenario: 'timeout', mode: 'retry' });
    expect(store.getState().phase).toBe('consenting');
    expect(store.getState().image).toBe(image);
  });

  it('a late result after stop is discarded, and the stop keeps the image', () => {
    const store = startStore();
    store.dispatch({ type: 'SET_SITE', site: 'face' });
    store.dispatch({ type: 'START_CAPTURE' });
    store.dispatch({ type: 'IMAGE_LOADED', image });
    store.dispatch({ type: 'CONFIRM_IMAGE' });
    store.dispatch({ type: 'CONSENT', value: true });
    store.dispatch({ type: 'SEND' });
    store.dispatch({ type: 'STOP_WAITING' });
    expect(store.getState().phase).toBe('reviewing');
    expect(store.getState().image).toBe(image);
    expect(store.getState().consented).toBe(false);
    store.dispatch({ type: 'RESULT_OK', result });
    expect(store.getState().phase).toBe('reviewing');
    expect(store.getState().result).toBeNull();
  });

  it('switching from the capture stage back to context keeps the record usable', () => {
    const store = startStore();
    store.dispatch({ type: 'SET_SITE', site: 'scalp' });
    store.dispatch({ type: 'START_CAPTURE' });
    store.dispatch({ type: 'BACK' });
    expect(store.getState().phase).toBe('contextSet');
    expect(store.getState().record.bodySite).toBe('scalp');
  });
});
