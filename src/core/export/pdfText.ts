const FIRST_PRINTABLE = 0x20;
const LAST_WIN_ANSI = 0xff;
const REPLACEMENT = '?';

/**
 * Standard PDF fonts only encode WinAnsi (Latin-1 plus a few symbols). Characters
 * outside that set become "?" in the PDF. The JSON export keeps the full text.
 */
export function toWinAnsi(text: string): string {
  let out = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const printable = code >= FIRST_PRINTABLE && code <= LAST_WIN_ANSI;
    out += printable ? char : REPLACEMENT;
  }
  return out;
}

export type Measure = (text: string) => number;

/**
 * Greedy word wrap by measured width. Honors explicit newlines. A single word
 * wider than the line is split by characters.
 */
export function wrapText(text: string, measure: Measure, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    lines.push(...wrapParagraph(paragraph, measure, maxWidth));
  }
  return lines;
}

function wrapParagraph(paragraph: string, measure: Measure, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of paragraph.split(/\s+/).filter((part) => part !== '')) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (measure(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current !== '') lines.push(current);
    const pieces = splitWord(word, measure, maxWidth);
    current = pieces.pop() ?? '';
    lines.push(...pieces);
  }
  lines.push(current);
  return lines;
}

function splitWord(word: string, measure: Measure, maxWidth: number): string[] {
  const pieces: string[] = [];
  let piece = '';
  for (const char of word) {
    if (piece !== '' && measure(piece + char) > maxWidth) {
      pieces.push(piece);
      piece = '';
    }
    piece += char;
  }
  pieces.push(piece);
  return pieces;
}
