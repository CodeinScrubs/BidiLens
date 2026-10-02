import { describe, expect, it } from 'vitest';
import { analyzeText, createBidiStream, findTechnicalTokenRanges, planInlineIsolation } from './index.js';
import { MOBILE_STUDY_CASES, QUERY_LITERALS } from '../../../scripts/fixtures/chatgpt-mobile-oct2.js';

describe('October 2 mobile screenshot-inspired logical reconstructions', () => {
  it.each(MOBILE_STUDY_CASES)('preserves the declared paragraph contract: $id', (item) => {
    const analysis = analyzeText(item.source, item.options);
    expect(analysis.text).toBe(item.source);
    expect(analysis.direction).toBe(item.direction);
    const plan = planInlineIsolation(item.source, item.direction);
    for (const token of item.isolations ?? []) {
      expect(plan.some((isolation) => isolation.text === token), token).toBe(true);
    }
    let cursor = 0;
    let recovered = '';
    for (const isolation of plan) {
      recovered += item.source.slice(cursor, isolation.start) + isolation.text;
      cursor = isolation.end;
    }
    expect(recovered + item.source.slice(cursor)).toBe(item.source);
  });

  it('does not present character majority as a language or author-intent detector', () => {
    const item = MOBILE_STUDY_CASES.find((entry) => entry.id === 'persian-intent')!;
    expect(analyzeText(item.source).direction).toBe('ltr');
    expect(analyzeText(item.source, { strategy: 'rtl' }).direction).toBe('rtl');
    expect(analyzeText(item.source, {
      technicalIdentifiers: ['Retrieval', 'polysaccharide', 'capsule', 'complement']
    }).direction).toBe('rtl');
    expect(analyzeText(MOBILE_STUDY_CASES.find((entry) => entry.id === 'english-mirror')!.source).direction).toBe('ltr');
  });

  it('reconciles English-leading Persian prose and English formulas at each chunk boundary', () => {
    for (const item of MOBILE_STUDY_CASES.filter((entry) => !entry.options)) {
      for (let split = 0; split <= item.source.length; split += 1) {
        const stream = createBidiStream();
        stream.push(item.source.slice(0, split));
        stream.push(item.source.slice(split));
        const final = stream.finish();
        expect(final.text).toBe(item.source);
        expect(final.direction, `${item.id} at ${split}`).toBe(item.direction);
      }
    }
  });

  it.each([QUERY_LITERALS[0]!, QUERY_LITERALS[2]!])('isolates a bare boundary-query literal completely: %s', (literal) => {
    const source = `برای جستجوی واژه، ${literal} را وارد کنید.`;
    expect(findTechnicalTokenRanges(source)).toContainEqual(expect.objectContaining({ text: literal, kind: 'code' }));
    expect(planInlineIsolation(source, 'rtl')).toContainEqual(expect.objectContaining({ text: literal, direction: 'ltr' }));
  });

  it('does not classify incomplete, embedded, or escaped boundary-query examples as complete code', () => {
    for (const source of [String.raw`\bTB`, String.raw`\bTB\bSuffix`, String.raw`prefix\bTB\b`,
      String.raw`\\bTB\b`, '[[:<:]]TB', '[[:<:]]TB[[:>:]]Suffix']) {
      expect(findTechnicalTokenRanges(source).filter((range) => range.kind === 'code'), source).toEqual([]);
    }
    for (const literal of [QUERY_LITERALS[0]!, QUERY_LITERALS[2]!]) {
      for (const word of ['é', 'ش', '²', 'Ⅳ', '𝒜', '𐒠']) {
        for (const source of [word + literal, literal + word]) {
          expect(findTechnicalTokenRanges(source).filter((range) => range.kind === 'code'), source).toEqual([]);
        }
      }
    }
  });

  it('joins only horizontal additive LTR units, not punctuation or separate paragraphs', () => {
    expect(planInlineIsolation('دفاع IgM + complement مهم است.', 'rtl').map((range) => range.text)).toEqual(['IgM + complement']);
    for (const separator of [': ', ', ', ' → ', '\n+ ', '\u2029+ ']) {
      expect(planInlineIsolation(`دفاع IgM${separator}complement مهم است.`, 'rtl').some((range) => range.text.includes(separator))).toBe(false);
    }
    expect(planInlineIsolation('این IgM + complement متن English است.', 'rtl').some((range) => range.text.includes('متن'))).toBe(false);
    expect(planInlineIsolation('سلام React + دنیا', 'ltr').some((range) => range.text.includes('سلام React'))).toBe(false);
    expect(planInlineIsolation(String.raw`Use \bTB\b + complement`, 'ltr')).toEqual([]);
  });
});
