import type { Direction } from './types.js';
import {
  NON_STRONG_BIDI_RANGES,
  NATURAL_LETTER_RANGES,
  RTL_BIDI_RANGES,
  UNICODE_BIDI_SHA256,
  UNICODE_GENERAL_CATEGORY_SHA256,
  UNICODE_BIDI_VERSION
} from './generated/bidi-ranges.js';

function isInRanges(codePoint: number, ranges: ReadonlyArray<number>): boolean {
  let low = 0;
  let high = ranges.length / 2 - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const start = ranges[middle * 2]!;
    const end = ranges[middle * 2 + 1]!;
    if (codePoint < start) high = middle - 1;
    else if (codePoint > end) low = middle + 1;
    else return true;
  }
  return false;
}

export function isRtlCodePoint(codePoint: number): boolean {
  return isInRanges(codePoint, RTL_BIDI_RANGES);
}

/** Returns the Unicode Bidi_Class strong direction, including LRM/RLM/ALM. */
export function classifyBidiStrongCharacter(character: string): Direction {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined || isInRanges(codePoint, NON_STRONG_BIDI_RANGES)) return 'neutral';
  return isRtlCodePoint(codePoint) ? 'rtl' : 'ltr';
}

/** Classifies natural-language letters while leaving numbers and punctuation neutral. */
export function classifyCharacter(character: string): Direction {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return 'neutral';
  return isInRanges(codePoint, NATURAL_LETTER_RANGES) ? classifyBidiStrongCharacter(character) : 'neutral';
}

export const UNICODE_DATA_VERSION = UNICODE_BIDI_VERSION;
export const UNICODE_DATA_SHA256 = UNICODE_BIDI_SHA256;
export const UNICODE_LETTER_DATA_SHA256 = UNICODE_GENERAL_CATEGORY_SHA256;
