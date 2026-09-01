import { describe, expect, it } from 'vitest';
import { containsCodePoint, decodeRangeDeltas } from './unicode-ranges.js';

describe('generated Unicode range encoding', () => {
  it('round-trips base-36 gap and length pairs into searchable ranges', () => {
    const ranges = decodeRangeDeltas('a,2,2,0,z,1');

    expect(ranges).toEqual([10, 12, 15, 15, 51, 52]);
    expect(containsCodePoint(ranges, 10)).toBe(true);
    expect(containsCodePoint(ranges, 14)).toBe(false);
    expect(containsCodePoint(ranges, 52)).toBe(true);
  });

  it('supports an empty generated table', () => {
    expect(decodeRangeDeltas('')).toEqual([]);
  });
});
