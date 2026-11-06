import { describe, expect, it } from 'vitest';
import { INITIAL_EXAM, reduceExam, type ExamDomain } from '@/features/desk/examStore';
import type { ExamImage } from '@/core/exam/contract';

const IMAGE: ExamImage = {
  original: new Blob(['o'], { type: 'image/jpeg' }),
  upload: new Blob(['u'], { type: 'image/jpeg' }),
  name: 'sample.webp',
  origin: 'sample',
};

function withRecord(state: ExamDomain): ExamDomain {
  return { ...state, contextSaved: true, bodySite: 'face', image: IMAGE, consented: true };
}

describe('reduceExam', () => {
  it('keeps the record and consent when the language changes (G6)', () => {
    const state = withRecord(INITIAL_EXAM);
    const next = reduceExam(state, { type: 'SET_LOCALE', locale: 'en' });
    expect(next.locale).toBe('en');
    expect(next.image).toBe(IMAGE);
    expect(next.consented).toBe(true);
    expect(next.bodySite).toBe('face');
  });

  it('resets consent and result when a new image is loaded (O7: consent is per image)', () => {
    const state = { ...withRecord(INITIAL_EXAM), result: null, failure: 'offline' as const };
    const next = reduceExam(state, { type: 'IMAGE_LOADED', image: IMAGE });
    expect(next.consented).toBe(false);
    expect(next.failure).toBeNull();
  });

  it('discarding the image clears consent and the result but keeps the context', () => {
    const next = reduceExam(withRecord(INITIAL_EXAM), { type: 'IMAGE_DISCARDED' });
    expect(next.image).toBeNull();
    expect(next.consented).toBe(false);
    expect(next.contextSaved).toBe(true);
  });

  it('DISCARD_RECORD clears everything except the locale', () => {
    const state = withRecord({ ...INITIAL_EXAM, locale: 'en' });
    const next = reduceExam(state, { type: 'DISCARD_RECORD' });
    expect(next).toEqual({ ...INITIAL_EXAM, locale: 'en' });
  });

  it('records a failure and clears any previous result', () => {
    const next = reduceExam(INITIAL_EXAM, { type: 'FAILED', scenario: 'timeout' });
    expect(next.failure).toBe('timeout');
    expect(next.result).toBeNull();
  });
});
