import type { Direction } from './types.js';
import {
  NON_STRONG_BIDI_RANGES,
  NATURAL_LETTER_RANGES,
  RTL_BIDI_RANGES,
  UNICODE_BIDI_SHA256,
  UNICODE_GENERAL_CATEGORY_SHA256,
  COMBINING_MARK_RANGES,
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

export interface CharacterClassification {
  codePoint: number;
  bidiClass: string;
  direction: Direction;
  isStrong: boolean;
  isWeak: boolean;
  isNeutral: boolean;
  isControl: boolean;
  isMark: boolean;
}

export function getCharacterClassification(codePoint: number): CharacterClassification {
  const isStrongR = isRtlCodePoint(codePoint);
  const isStrongL = !containsCodePoint(NON_STRONG_BIDI_RANGES, codePoint) && !isStrongR;
  const isStrong = isStrongR || isStrongL;
  const isMark = containsCodePoint(COMBINING_MARK_RANGES, codePoint);

  const isArabicNumber = (codePoint >= 0x0660 && codePoint <= 0x0669) || codePoint === 0x066B || codePoint === 0x066C;
  const isEuropeanNumber = codePoint >= 0x0030 && codePoint <= 0x0039;
  const isParagraphSeparator = codePoint === 0x000A || codePoint === 0x000D || codePoint === 0x0085 || codePoint === 0x2029;
  const isSegmentSeparator = codePoint === 0x0009 || codePoint === 0x001F;
  const isBoundaryNeutral = (codePoint >= 0x0000 && codePoint <= 0x0008)
    || (codePoint >= 0x000E && codePoint <= 0x001B)
    || (codePoint >= 0x007F && codePoint <= 0x0084)
    || (codePoint >= 0x0086 && codePoint <= 0x009F)
    || codePoint === 0x00AD
    || (codePoint >= 0x200B && codePoint <= 0x200D)
    || (codePoint >= 0x2060 && codePoint <= 0x2064);

  let bidiClass: string;
  let isWeak = false;
  let isNeutral = false;
  const isControl = (codePoint >= 0x202A && codePoint <= 0x202E) || (codePoint >= 0x2066 && codePoint <= 0x2069);

  if (isStrongR) {
    bidiClass = 'AL';
  } else if (isStrongL) {
    bidiClass = 'L';
  } else if (isMark) {
    bidiClass = 'NSM';
    isWeak = true;
  } else if (isArabicNumber) {
    bidiClass = 'AN';
    isWeak = true;
  } else if (isEuropeanNumber) {
    bidiClass = 'EN';
    isWeak = true;
  } else if (isBoundaryNeutral) {
    bidiClass = 'BN';
    isWeak = true;
  } else if (isParagraphSeparator) {
    bidiClass = 'B';
    isNeutral = true;
  } else if (isSegmentSeparator) {
    bidiClass = 'S';
    isNeutral = true;
  } else if (codePoint === 0x0020 || codePoint === 0x00A0 || codePoint === 0x1680 || (codePoint >= 0x2000 && codePoint <= 0x200A) || codePoint === 0x202F || codePoint === 0x205F || codePoint === 0x3000) {
    bidiClass = 'WS';
    isNeutral = true;
  } else {
    bidiClass = 'ON';
    isNeutral = true;
  }

  let direction: Direction = 'neutral';
  if (isStrongR) direction = 'rtl';
  else if (isStrongL) direction = 'ltr';

  return {
    codePoint,
    bidiClass,
    direction,
    isStrong,
    isWeak,
    isNeutral,
    isControl,
    isMark
  };
}

export function classifyCharacter(codePoint: number): CharacterClassification;
export function classifyCharacter(character: string): Direction;
export function classifyCharacter(input: string | number): Direction | CharacterClassification {
  if (typeof input === 'number') {
    return getCharacterClassification(input);
  }
  const codePoint = input.codePointAt(0);
  if (codePoint === undefined) return 'neutral';
  return containsCodePoint(NATURAL_LETTER_RANGES, codePoint) ? classifyBidiStrongCharacter(input) : 'neutral';
}

export const UNICODE_DATA_VERSION = UNICODE_BIDI_VERSION;
export const UNICODE_DATA_SHA256 = UNICODE_BIDI_SHA256;
export const UNICODE_LETTER_DATA_SHA256 = UNICODE_GENERAL_CATEGORY_SHA256;
