import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  analyzeText,
  createBidiStream,
  hasBidiControls,
  isolateText,
  planInlineIsolation,
  sanitizeBidiControls,
  segmentDirectionalRuns,
  stripBidiControls
} from './index.js';

const propertyParameters = { numRuns: 500, endOnFailure: true } as const;

function splitsFor(text: string, values: readonly number[]): string[] {
  if (!text) return [''];
  const boundaries = [...new Set(values.map((value) => value % (text.length + 1)).filter((value) => value > 0 && value < text.length))]
    .sort((a, b) => a - b);
  const chunks: string[] = [];
  let start = 0;
  for (const end of boundaries) {
    chunks.push(text.slice(start, end));
    start = end;
  }
  chunks.push(text.slice(start));
  return chunks;
}

function splitsSurrogatePair(text: string, offset: number): boolean {
  if (offset <= 0 || offset >= text.length) return false;
  const before = text.charCodeAt(offset - 1);
  const after = text.charCodeAt(offset);
  return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff;
}

describe('property-based invariants', () => {
  it('never mutates source text and reports internally consistent raw counts', () => {
    fc.assert(fc.property(fc.string({ maxLength: 300 }), (source) => {
      const result = analyzeText(source);
      expect(result.text).toBe(source);
      expect(result.rawCounts.total).toBe(result.rawCounts.ltr + result.rawCounts.rtl);
      expect(result.counts.total).toBe(result.counts.ltr + result.counts.rtl);
      expect(result.mixed).toBe(result.rawCounts.ltr > 0 && result.rawCounts.rtl > 0);
    }), propertyParameters);
  });

  it('segments and plain-text isolates round-trip to the original source', () => {
    fc.assert(fc.property(fc.string({ maxLength: 300 }), (source) => {
      expect(segmentDirectionalRuns(source).map((run) => run.text).join('')).toBe(source);
      expect(stripBidiControls(isolateText(source))).toBe(stripBidiControls(source));
    }), propertyParameters);
  });

  it('always emits ordered, non-overlapping, source-aligned isolation ranges', () => {
    fc.assert(fc.property(
      fc.string({ maxLength: 300 }),
      fc.constantFrom<'ltr' | 'rtl'>('ltr', 'rtl'),
      (source, direction) => {
        const plans = planInlineIsolation(source, direction);
        for (let index = 0; index < plans.length; index += 1) {
          const plan = plans[index]!;
          expect(Number.isInteger(plan.start)).toBe(true);
          expect(Number.isInteger(plan.end)).toBe(true);
          expect(plan.start).toBeGreaterThanOrEqual(0);
          expect(plan.end).toBeGreaterThan(plan.start);
          expect(plan.end).toBeLessThanOrEqual(source.length);
          expect(plan.text).toBe(source.slice(plan.start, plan.end));
          expect(splitsSurrogatePair(source, plan.start)).toBe(false);
          expect(splitsSurrogatePair(source, plan.end)).toBe(false);
          if (index > 0) expect(plans[index - 1]!.end).toBeLessThanOrEqual(plan.start);
        }
      }
    ), propertyParameters);
  });

  it('produces batch-equivalent final output for arbitrary chunk boundaries', () => {
    const textArbitrary = fc.array(fc.oneof(
      fc.string({ maxLength: 24 }),
      fc.constantFrom('\n', '\r', '\r\n', '\u2029', 'سلام', 'React', '😀', '`code`', 'https://example.com')
    ), { maxLength: 16 }).map((parts) => parts.join(''));
    fc.assert(fc.property(
      textArbitrary,
      fc.array(fc.nat(), { maxLength: 40 }),
      (source, boundaryValues) => {
        const stream = createBidiStream();
        for (const chunk of splitsFor(source, boundaryValues)) stream.push(chunk);
        const final = stream.finish();
        const batch = analyzeText(source, { fallback: 'ltr' });
        expect(final.text).toBe(source);
        expect(final.paragraphs.map((paragraph) => paragraph.text)).toEqual(batch.paragraphs.map((paragraph) => paragraph.text));
        expect(final.paragraphs.map((paragraph) => paragraph.direction)).toEqual(batch.paragraphs.map((paragraph) => paragraph.direction));
        expect(final.direction).toBe(batch.paragraphs.at(-1)?.direction);
        expect(final.finished).toBe(true);
      }
    ), { numRuns: 300, endOnFailure: true });
  });

  it('sanitization is idempotent and removes every recognized bidi control by default', () => {
    fc.assert(fc.property(fc.string({ maxLength: 300 }), (source) => {
      const once = sanitizeBidiControls(source).text;
      const twice = sanitizeBidiControls(once).text;
      expect(twice).toBe(once);
      expect(hasBidiControls(once)).toBe(false);
    }), propertyParameters);
  });
});
