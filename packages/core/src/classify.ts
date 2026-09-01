import type { Direction } from './types.js';
import {
  NON_STRONG_BIDI_RANGES,
  NATURAL_LETTER_RANGES,
  RTL_BIDI_RANGES,
  UNICODE_BIDI_SHA256,
  UNICODE_GENERAL_CATEGORY_SHA256,
  UNICODE_BIDI_VERSION
} from './generated/bidi-ranges.js';
import { containsCodePoint } from './unicode-ranges.js';

export function isRtlCodePoint(codePoint: number): boolean {
  return containsCodePoint(RTL_BIDI_RANGES, codePoint);
}

/** Returns the Unicode Bidi_Class strong direction, including LRM/RLM/ALM. */
export function classifyBidiStrongCharacter(character: string): Direction {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined || containsCodePoint(NON_STRONG_BIDI_RANGES, codePoint)) return 'neutral';
  return isRtlCodePoint(codePoint) ? 'rtl' : 'ltr';
}

/** Classifies natural-language letters while leaving numbers and punctuation neutral. */
export function classifyCharacter(character: string): Direction {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return 'neutral';
  return containsCodePoint(NATURAL_LETTER_RANGES, codePoint) ? classifyBidiStrongCharacter(character) : 'neutral';
}

export const UNICODE_DATA_VERSION = UNICODE_BIDI_VERSION;
export const UNICODE_DATA_SHA256 = UNICODE_BIDI_SHA256;
export const UNICODE_LETTER_DATA_SHA256 = UNICODE_GENERAL_CATEGORY_SHA256;
