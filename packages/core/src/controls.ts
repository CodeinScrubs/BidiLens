import type { Direction } from './types.js';

export const BIDI_CONTROLS = Object.freeze({
  LRM: '\u200E',
  RLM: '\u200F',
  LRE: '\u202A',
  RLE: '\u202B',
  PDF: '\u202C',
  LRO: '\u202D',
  RLO: '\u202E',
  LRI: '\u2066',
  RLI: '\u2067',
  FSI: '\u2068',
  PDI: '\u2069'
});

const ALL_CONTROLS_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

export function isolateText(text: string, direction: Direction = 'neutral'): string {
  const opener = direction === 'ltr'
    ? BIDI_CONTROLS.LRI
    : direction === 'rtl'
      ? BIDI_CONTROLS.RLI
      : BIDI_CONTROLS.FSI;
  return `${opener}${text}${BIDI_CONTROLS.PDI}`;
}

export function stripBidiControls(text: string): string {
  return text.replace(ALL_CONTROLS_RE, '');
}

export function hasBidiControls(text: string): boolean {
  ALL_CONTROLS_RE.lastIndex = 0;
  return ALL_CONTROLS_RE.test(text);
}
