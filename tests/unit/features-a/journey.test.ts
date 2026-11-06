import { describe, expect, it } from 'vitest';
import { journeyStepId, journeySteps, JOURNEY_STEP_IDS } from '@/features/desk/journey';
import { copy } from '@/features/desk/copy';

describe('journeyStepId', () => {
  it.each([
    ['/contexto', 'contexto'],
    ['/imagen', 'imagen'],
    ['/imagen/camara', 'imagen'],
    ['/imagen/muestras', 'imagen'],
    ['/imagen/calidad', 'imagen'],
    ['/envio', 'analisis'],
    ['/envio/procesando', 'analisis'],
  ])('maps %s to %s', (path, step) => {
    expect(journeyStepId(path)).toBe(step);
  });

  it.each(['/', '/guia', '/guia/privacidad', '/recuperacion/permiso', '/revision', '/imagenes', '/contexto/x'])(
    'shows no journey on %s',
    (path) => {
      expect(journeyStepId(path)).toBeUndefined();
    },
  );
});

describe('journeySteps', () => {
  it('lists the six steps in order with their phase tint', () => {
    const steps = journeySteps((key) => key);
    expect(steps.map((step) => step.id)).toEqual([...JOURNEY_STEP_IDS]);
    expect(steps.map((step) => step.tint)).toEqual(['sky', 'mint', 'butter', 'lilac', 'blush', 'neutral']);
  });
});

describe('journey copy parity', () => {
  it('has the same step and progress keys in ES and EN', () => {
    const keys = Object.keys(copy.es).filter((key) => key.startsWith('step'));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(Object.keys(copy.en)).toContain(key);
    }
  });
});
