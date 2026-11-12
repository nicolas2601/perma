import { describe, expect, it } from 'vitest';
import alertCaptureRaw from '../../../fixtures/api/analyze-MOCO_HAM7-sample_05_ISIC_0011089_image.json?raw';
import quietCaptureRaw from '../../../fixtures/api/analyze-MOCO_HAM7-reference-tschandl-600.json?raw';
import { analyzeResponseSchema, toAnalysisResult } from '@/core/inference/analyzeContract';
import { parseOrInvalid, predictResponseSchema, toInferenceResult } from '@/core/inference/contract';
import { InferenceError } from '@/core/inference/types';

function classificationOf(raw: string): Record<string, unknown> {
  return (JSON.parse(raw) as { classification: Record<string, unknown> }).classification;
}

describe('melanoma-priority screening block', () => {
  it('maps a real capture where the screening point flags melanoma over a nevus argmax', () => {
    const body = parseOrInvalid(analyzeResponseSchema, JSON.parse(alertCaptureRaw), 'analyze');
    const result = toAnalysisResult(body, 0);

    expect(body.classification.pred).toBe('nv');
    expect(result.screening).toMatchObject({
      status: 'ok',
      ruleId: 'melanoma-priority-v1',
      target: 'mel',
      logOffset: 1.5,
      pred: 'mel',
      alert: true,
      differsFromPred: true,
    });
    if (result.screening?.status !== 'ok') throw new Error('expected an ok screening block');
    expect(result.screening.development?.nested.targetRecall).toBeCloseTo(0.7673, 4);
    expect(result.screening.development?.nested.targetPrecision).toBeCloseTo(0.3239, 4);
  });

  it('maps a real capture without an alert', () => {
    const result = toAnalysisResult(parseOrInvalid(analyzeResponseSchema, JSON.parse(quietCaptureRaw), 'analyze'), 0);

    expect(result.screening).toMatchObject({ status: 'ok', alert: false, differsFromPred: false, pred: 'nv' });
  });

  it('keeps results from a backend without the block valid and without screening', () => {
    const older = classificationOf(alertCaptureRaw);
    delete older.screening;
    const result = toInferenceResult(parseOrInvalid(predictResponseSchema, older, 'predict'), 0);

    expect(result.screening).toBeUndefined();
  });

  it('maps an unavailable block with its reason', () => {
    const body = { ...classificationOf(alertCaptureRaw), screening: { status: 'unavailable', reason: 'policy_not_configured' } };
    const result = toInferenceResult(parseOrInvalid(predictResponseSchema, body, 'predict'), 0);

    expect(result.screening).toEqual({ status: 'unavailable', reason: 'policy_not_configured' });
  });

  it('rejects a malformed block as an invalid response, never a partial result', () => {
    const capture = classificationOf(alertCaptureRaw);
    const screening = { ...(capture.screening as Record<string, unknown>), alert: 'yes' };

    expect(() => parseOrInvalid(predictResponseSchema, { ...capture, screening }, 'predict')).toThrow(InferenceError);
  });

  it('rejects an ok block whose screening pred is not a known class', () => {
    const capture = classificationOf(alertCaptureRaw);
    const screening = { ...(capture.screening as Record<string, unknown>), pred: 'melanoma' };

    expect(() => parseOrInvalid(predictResponseSchema, { ...capture, screening }, 'predict')).toThrow(InferenceError);
  });
});
