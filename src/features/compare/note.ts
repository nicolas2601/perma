export const MAX_NOTE_LENGTH = 2000;

/** Edge validation for the professional note: trims, bounds length, rejects control characters. */
export function normalizeNote(raw: string): string {
  const cleaned = raw.replace(/\p{Cc}/gu, (char) => (char === '\n' ? char : '')).trim();
  return cleaned.slice(0, MAX_NOTE_LENGTH);
}

export function noteAtLimit(raw: string): boolean {
  return raw.length >= MAX_NOTE_LENGTH;
}
