/**
 * Validate and clamp a numeric option without allowing NaN or infinities to
 * poison direction comparisons. Finite values retain the historical
 * clamping behavior; non-finite values are caller errors.
 */
export function boundedNumberOption(
  name: string,
  value: number | undefined,
  defaultValue: number,
  minimum: number,
  maximum: number
): number {
  const resolved = value ?? defaultValue;
  if (!Number.isFinite(resolved)) {
    throw new RangeError(`${name} must be a finite number.`);
  }
  return Math.min(maximum, Math.max(minimum, resolved));
}
