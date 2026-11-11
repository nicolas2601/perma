import { describe, expect, it } from 'vitest';
import { itaCategoryFor, simulatedExplainability } from '@/core/inference/mockExplain';
import { MockInferenceClient } from '@/core/inference/mock';
import { toneStopLabel } from '@/core/explain/toneCache';

const imageBlob = (text: string) => new Blob([text], { type: 'image/jpeg' });

describe('simulated explainability (mock only)', () => {
  it('maps ITA degrees to Chardon categories', () => {
    expect(itaCategoryFor(60)).toBe('very_light');
    expect(itaCategoryFor(45)).toBe('light');
    expect(itaCategoryFor(30)).toBe('intermediate');
    expect(itaCategoryFor(15)).toBe('tan');
    expect(itaCategoryFor(-10)).toBe('brown');
    expect(itaCategoryFor(-40)).toBe('dark');
  });

  it('is deterministic for the same seed and labelled as mock', () => {
    const a = simulatedExplainability(7);
    const b = simulatedExplainability(7);
    expect(a).toEqual(b);
    expect(a.segmentation.source).toBe('mock');
  });

  it('keeps every contour point inside the simulated image bounds', () => {
    const { segmentation } = simulatedExplainability(3);
    if (segmentation.status !== 'ok') throw new Error('expected ok segmentation');
    for (const [x, y] of segmentation.contour) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(segmentation.imageWidth);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(segmentation.imageHeight);
    }
  });

  it('gives the mock analyze result a mock source and the simulated warning', async () => {
    const client = new MockInferenceClient({ defaultModel: 'MOCO_HAM7' });
    const result = await client.analyze({ file: imageBlob('case-1') });
    expect(result.source).toBe('mock');
    expect(result.segmentation?.source).toBe('mock');
    expect(result.warnings).toContain('simulated-model');
  });

  it('returns the image unchanged for delta 0 in simulated tone', async () => {
    const client = new MockInferenceClient({ defaultModel: 'MOCO_HAM7' });
    const tone = await client.simulateTone({ file: imageBlob('case-2'), maskPngBase64: 'x', deltaL: 0 });
    expect(tone.deltaL).toBe(0);
    expect(tone.source).toBe('mock');
    expect(toneStopLabel(-8)).toContain('(simulación)');
  });
});
