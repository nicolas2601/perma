import { describe, expect, it } from 'vitest';
import {
  clampPan,
  clampScale,
  DOUBLE_TAP_SCALE,
  inertiaVelocity,
  MAX_SCALE,
  MIN_SCALE,
  nextDoubleTapScale,
  pinchScale,
} from '@/features/inspect/zoomMath';
import { parseTab } from '@/features/inspect/ViewerScreen';
import { MAX_NOTE_LENGTH, noteAtLimit, normalizeNote } from '@/features/compare/note';

describe('zoom math', () => {
  it('clamps scale to the working range and rejects non-finite input', () => {
    expect(clampScale(0.2)).toBe(MIN_SCALE);
    expect(clampScale(99)).toBe(MAX_SCALE);
    expect(clampScale(Number.NaN)).toBe(MIN_SCALE);
  });

  it('toggles double tap between fit and the working zoom level', () => {
    expect(nextDoubleTapScale(MIN_SCALE)).toBe(DOUBLE_TAP_SCALE);
    expect(nextDoubleTapScale(DOUBLE_TAP_SCALE)).toBe(MIN_SCALE);
  });

  it('scales pinch gestures by the finger distance ratio', () => {
    expect(pinchScale(1, 100, 200)).toBe(2);
    expect(pinchScale(2, 100, 50)).toBe(MIN_SCALE);
  });

  it('keeps pan inside the scaled bounds so no empty margin is dragged in', () => {
    const viewport = { width: 300, height: 400 };
    expect(clampPan({ x: 999, y: -999 }, 2, viewport)).toEqual({ x: 150, y: -200 });
    expect(clampPan({ x: 10, y: 10 }, MIN_SCALE, viewport)).toEqual({ x: 0, y: 0 });
  });

  it('decays inertia geometrically until it stops', () => {
    let velocity = 5;
    let frames = 0;
    while (velocity !== 0 && frames < 1000) {
      velocity = inertiaVelocity(velocity);
      frames += 1;
    }
    expect(velocity).toBe(0);
    expect(frames).toBeLessThan(200);
  });
});

describe('viewer tab parsing', () => {
  it('falls back to the image tab for unknown values', () => {
    expect(parseTab('salida')).toBe('salida');
    expect(parseTab('observaciones')).toBe('observaciones');
    expect(parseTab('desconocido')).toBe('imagen');
    expect(parseTab(null)).toBe('imagen');
  });
});

describe('professional note edge rules', () => {
  it('strips control characters but keeps line breaks, and trims', () => {
    expect(normalizeNote('  linea\u0007 uno\nlinea dos  ')).toBe('linea uno\nlinea dos');
  });

  it('bounds the stored length', () => {
    const long = 'a'.repeat(MAX_NOTE_LENGTH + 50);
    expect(normalizeNote(long)).toHaveLength(MAX_NOTE_LENGTH);
    expect(noteAtLimit('a'.repeat(MAX_NOTE_LENGTH))).toBe(true);
  });
});
