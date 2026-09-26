import * as ranges from './generated/grapheme-ranges.js';
import { containsCodePoint } from './unicode-ranges.js';

type BreakProperty = 'Other' | 'CR' | 'LF' | 'Control' | 'Extend' | 'ZWJ' | 'Regional_Indicator' | 'Prepend' | 'SpacingMark' | 'L' | 'V' | 'T' | 'LV' | 'LVT';
const properties: Array<[BreakProperty, readonly number[]]> = [
  ['CR', ranges.GCB_CR], ['LF', ranges.GCB_LF], ['Control', ranges.GCB_CONTROL],
  ['Extend', ranges.GCB_EXTEND], ['ZWJ', ranges.GCB_ZWJ], ['Regional_Indicator', ranges.GCB_REGIONAL_INDICATOR],
  ['Prepend', ranges.GCB_PREPEND], ['SpacingMark', ranges.GCB_SPACINGMARK],
  ['L', ranges.GCB_L], ['V', ranges.GCB_V], ['T', ranges.GCB_T], ['LV', ranges.GCB_LV], ['LVT', ranges.GCB_LVT]
];
const isControl = (property: BreakProperty): boolean => property === 'CR' || property === 'LF' || property === 'Control';
// GCB properties are disjoint. One sorted index replaces a separate binary
// search through every property table for each non-ASCII scalar.
const propertyRanges = properties.flatMap(([property, values]) => {
  const entries: Array<{ start: number; end: number; property: BreakProperty }> = [];
  for (let index = 0; index < values.length; index += 2) {
    entries.push({ start: values[index]!, end: values[index + 1]!, property });
  }
  return entries;
}).sort((left, right) => left.start - right.start);
function breakProperty(codePoint: number): BreakProperty {
  // ASCII has no Extend, Prepend, Indic, or emoji properties. Avoid fourteen
  // table searches for each ordinary character in streamed English fragments.
  if (codePoint < 0x80) {
    if (codePoint === 0x0d) return 'CR';
    if (codePoint === 0x0a) return 'LF';
    return codePoint < 0x20 || codePoint === 0x7f ? 'Control' : 'Other';
  }
  let low = 0;
  let high = propertyRanges.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const range = propertyRanges[middle]!;
    if (codePoint < range.start) high = middle - 1;
    else if (codePoint > range.end) low = middle + 1;
    else return range.property;
  }
  return 'Other';
}

/** Pinned Unicode 17 extended grapheme boundaries, in original UTF-16 offsets. */
export function graphemeBoundaries(text: string): number[] {
  const boundaries = [0];
  let offset = 0;
  let previous: BreakProperty = 'Other';
  let regionalCount = 0;
  let pictographicExtend = false;
  let previousZwjAfterPictographic = false;
  let conjunctConsonant = false;
  let conjunctLinker = false;
  for (const character of text) {
    const codePoint = character.codePointAt(0)!;
    const current = breakProperty(codePoint);
    const nonAscii = codePoint >= 0x80;
    const pictographic = nonAscii && containsCodePoint(ranges.EXTENDED_PICTOGRAPHIC, codePoint);
    const consonant = nonAscii && containsCodePoint(ranges.INCB_CONSONANT, codePoint);
    const linker = nonAscii && containsCodePoint(ranges.INCB_LINKER, codePoint);
    const conjunctExtend = nonAscii && containsCodePoint(ranges.INCB_EXTEND, codePoint);
    let joins = previous === 'CR' && current === 'LF'; // GB3
    if (!joins && !isControl(previous) && !isControl(current)) {
      joins = (previous === 'L' && (current === 'L' || current === 'V' || current === 'LV' || current === 'LVT')) // GB6
        || ((previous === 'LV' || previous === 'V') && (current === 'V' || current === 'T')) // GB7
        || ((previous === 'LVT' || previous === 'T') && current === 'T') // GB8
        || current === 'Extend' || current === 'ZWJ' || current === 'SpacingMark' // GB9/9a
        || previous === 'Prepend' // GB9b
        || (consonant && conjunctConsonant && conjunctLinker) // GB9c
        || (pictographic && previousZwjAfterPictographic) // GB11
        || (previous === 'Regional_Indicator' && current === 'Regional_Indicator' && regionalCount % 2 === 1); // GB12/13
    }
    if (offset > 0 && !joins) boundaries.push(offset);
    previousZwjAfterPictographic = current === 'ZWJ' && pictographicExtend;
    pictographicExtend = pictographic || (current === 'Extend' && pictographicExtend);
    if (consonant) { conjunctConsonant = true; conjunctLinker = false; }
    else if (linker || conjunctExtend) { conjunctLinker ||= linker && conjunctConsonant; }
    else { conjunctConsonant = false; conjunctLinker = false; }
    regionalCount = current === 'Regional_Indicator' ? regionalCount + 1 : 0;
    previous = current;
    offset += character.length;
  }
  if (offset > 0) boundaries.push(offset);
  return boundaries;
}

/** Round ranges outwards once, without rescanning a prefix for every range. */
export function graphemeRangeExpander(text: string): (start: number, end: number) => { start: number; end: number } {
  const boundaries = graphemeBoundaries(text);
  const floor = (offset: number): number => {
    let low = 0;
    let high = boundaries.length;
    while (low + 1 < high) {
      const middle = (low + high) >>> 1;
      if (boundaries[middle]! <= offset) low = middle;
      else high = middle;
    }
    return low;
  };
  return (start, end) => {
    const first = floor(start);
    const last = floor(end);
    return { start: boundaries[first]!, end: boundaries[last] === end ? end : boundaries[last + 1]! };
  };
}
