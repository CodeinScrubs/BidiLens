import type { Direction } from './types.js';

/**
 * Controls recognized by the security utilities: the 12 Unicode Bidi_Control
 * characters plus six deprecated U+206A..U+206F formatting controls.
 * This is not an alias for the Unicode Bidi_Control property.
 */
export const BIDI_CONTROLS = Object.freeze({
  ALM: '\u061C',
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
  PDI: '\u2069',
  ISS: '\u206A',
  ASS: '\u206B',
  IAFS: '\u206C',
  AAFS: '\u206D',
  NADS: '\u206E',
  NODS: '\u206F'
});

const ALL_CONTROLS_RE = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u206F]/g;

export function isolateText(text: string, direction: Direction = 'neutral'): string {
  const opener = direction === 'ltr'
    ? BIDI_CONTROLS.LRI
    : direction === 'rtl'
      ? BIDI_CONTROLS.RLI
      : BIDI_CONTROLS.FSI;
  return `${opener}${text}${BIDI_CONTROLS.PDI}`;
}

/**
 * Explicitly removes recognized controls. With preserveLength, replace each
 * with one ASCII space, retaining UTF-16/code-point offsets of other text.
 * This changes content; use for an opted-in diagnostic/display copy, not as
 * an automatic edit to stored prose, source code, or clipboard contents.
 */
export function stripBidiControls(text: string, options?: { preserveLength?: boolean }): string {
  if (options?.preserveLength) {
    return text.replace(ALL_CONTROLS_RE, ' ');
  }
  return text.replace(ALL_CONTROLS_RE, '');
}

export function hasBidiControls(text: string): boolean {
  ALL_CONTROLS_RE.lastIndex = 0;
  return ALL_CONTROLS_RE.test(text);
}
