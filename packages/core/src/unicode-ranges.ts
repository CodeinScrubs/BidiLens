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
