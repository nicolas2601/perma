import { describe, expect, it } from 'vitest';
import { parseTab } from '@/features/inspect/viewerTab';
import { MAX_NOTE_LENGTH, noteAtLimit, normalizeNote } from '@/features/compare/note';

describe('viewer tab parsing', () => {
  it('keeps known tabs and falls back to the image view for unknown values', () => {
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
