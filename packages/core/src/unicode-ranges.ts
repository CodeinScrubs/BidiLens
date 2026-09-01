/** Expands generated base-36 gap/length pairs into sorted, flattened ranges. */
export function decodeRangeDeltas(encoded: string): ReadonlyArray<number> {
  if (!encoded) return [];
  const deltas = encoded.split(',');
  const ranges = new Array<number>(deltas.length);
  let previousEnd = -1;
  for (let index = 0; index < deltas.length; index += 2) {
    const start = previousEnd + 1 + Number.parseInt(deltas[index]!, 36);
    const end = start + Number.parseInt(deltas[index + 1]!, 36);
    ranges[index] = start;
    ranges[index + 1] = end;
    previousEnd = end;
  }
  return ranges;
}

/** Binary-searches the sorted, flattened Unicode range tables generated from UCD data. */
export function containsCodePoint(ranges: ReadonlyArray<number>, codePoint: number): boolean {
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
