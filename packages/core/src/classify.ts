import type { Direction } from './types.js';

// Strong RTL scripts and presentation forms commonly used by Hebrew, Arabic,
// Syriac, Thaana, N'Ko, Samaritan, Mandaic, Manichaean, Psalter Pahlavi,
// Adlam, and related scripts. Numbers and punctuation are intentionally not
// treated as strong characters.
const RTL_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0590, 0x05ff],
  [0x0600, 0x06ff],
  [0x0700, 0x074f],
  [0x0750, 0x077f],
  [0x0780, 0x07bf],
  [0x07c0, 0x07ff],
  [0x0800, 0x083f],
  [0x0840, 0x085f],
  [0x0860, 0x086f],
  [0x0870, 0x089f],
  [0x08a0, 0x08ff],
  [0xfb1d, 0xfdff],
  [0xfe70, 0xfeff],
  [0x10840, 0x1085f],
  [0x10860, 0x1087f],
  [0x10880, 0x108af],
  [0x108e0, 0x108ff],
  [0x10900, 0x1093f],
  [0x10980, 0x109ff],
  [0x10a00, 0x10a5f],
  [0x10a60, 0x10a7f],
  [0x10a80, 0x10a9f],
  [0x10ac0, 0x10aff],
  [0x10b00, 0x10b7f],
  [0x10b80, 0x10baf],
  [0x10d00, 0x10d3f],
  [0x10e80, 0x10ebf],
  [0x10f00, 0x10f6f],
  [0x10fb0, 0x10fdf],
  [0x1e800, 0x1e8df],
  [0x1e900, 0x1e95f],
  [0x1ec70, 0x1ecbf],
  [0x1ed00, 0x1ed4f],
  [0x1ee00, 0x1eeff]
];

const LETTER_RE = /\p{Letter}/u;

export function isRtlCodePoint(codePoint: number): boolean {
  let low = 0;
  let high = RTL_RANGES.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const range = RTL_RANGES[middle]!;
    if (codePoint < range[0]) high = middle - 1;
    else if (codePoint > range[1]) low = middle + 1;
    else return true;
  }
  return false;
}

export function classifyCharacter(character: string): Direction {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return 'neutral';
  if (isRtlCodePoint(codePoint) && LETTER_RE.test(character)) return 'rtl';
  if (LETTER_RE.test(character)) return 'ltr';
  return 'neutral';
}
