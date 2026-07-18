import { describe, expect, it } from 'vitest';
import {
  BIDI_CONTROLS,
  analyzeText,
  createBidiStream,
  detectDirection,
  findBidiControls,
  isolateText,
  sanitizeBidiControls,
  segmentDirectionalRuns,
  stripBidiControls,
  findTechnicalTokenRanges,
  planInlineIsolation
} from './index.js';

describe('direction detection', () => {
  it('uses content-majority by default for the flagship Persian sentence', () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const analysis = analyzeText(source);
    expect(analysis.direction).toBe('rtl');
    expect(analysis.firstStrong).toBe('rtl');
    expect(analysis.text).toBe(source);
  });

  it('keeps an English-majority sentence LTR when it contains Persian', () => {
    expect(detectDirection('The Persian word کتاب means book.')).toBe('ltr');
  });

  it('excludes known technical identifiers from natural-language evidence', () => {
    const ranges = findTechnicalTokenRanges('React and TypeScript در یک جمله.');
    expect(ranges.map((range) => range.text)).toEqual(['React', 'TypeScript']);
    expect(detectDirection('React یک کتابخانه است.')).toBe('rtl');
  });

  it('retains configurable first-strong behavior for compatibility', () => {
    expect(detectDirection('English سلام.', { strategy: 'first-strong' })).toBe('ltr');
  });

  it('detects Persian and English', () => {
    expect(detectDirection('سلام دنیا')).toBe('rtl');
    expect(detectDirection('hello world')).toBe('ltr');
  });

  it('ignores leading punctuation', () => {
    expect(detectDirection('✅ (سلام) version 2')).toBe('rtl');
  });

  it('supports neutral fallback', () => {
    expect(detectDirection('2026-07-18', { fallback: 'neutral' })).toBe('neutral');
  });

  it('analyzes paragraphs independently', () => {
    const result = analyzeText('Hello\nسلام');
    expect(result.paragraphs.map((paragraph) => paragraph.direction)).toEqual(['ltr', 'rtl']);
    expect(result.mixed).toBe(true);
  });
});

describe('isolation and segmentation', () => {
  it('plans the leading technical identifier without changing source order', () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const plans = planInlineIsolation(source, 'rtl');
    expect(plans[0]).toMatchObject({ text: 'React', direction: 'ltr', kind: 'identifier', start: 0, end: 5 });
    expect(source).toBe('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
  });

  it('isolates technical URLs inside RTL prose', () => {
    const plans = planInlineIsolation('برای مستندات https://example.com مراجعه کنید.', 'rtl');
    expect(plans).toContainEqual(expect.objectContaining({ text: 'https://example.com', direction: 'ltr', kind: 'url' }));
  });

  it('wraps text with isolates', () => {
    expect(isolateText('سلام', 'rtl')).toBe(`${BIDI_CONTROLS.RLI}سلام${BIDI_CONTROLS.PDI}`);
  });

  it('segments directional runs', () => {
    const runs = segmentDirectionalRuns('سلام API دنیا');
    expect(runs.some((run) => run.direction === 'rtl')).toBe(true);
    expect(runs.some((run) => run.direction === 'ltr')).toBe(true);
  });

  it('strips controls', () => {
    const value = `${BIDI_CONTROLS.RLO}abc${BIDI_CONTROLS.PDF}`;
    expect(stripBidiControls(value)).toBe('abc');
  });
});

describe('streaming', () => {
  it('settles the flagship sentence from provisional LTR to RTL exactly once', () => {
    const stream = createBidiStream();
    expect(stream.push('React ').direction).toBe('ltr');
    const settled = stream.push('یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(settled.direction).toBe('rtl');
    expect(settled.text).toBe('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(stream.finish().direction).toBe('rtl');
    expect(() => stream.push(' more')).toThrow('Cannot push after finish()');
  });

  it('locks after the first strong character', () => {
    const stream = createBidiStream({ strategy: 'first-strong', fallback: 'ltr' });
    expect(stream.push('...').direction).toBe('ltr');
    expect(stream.push('س').direction).toBe('rtl');
    expect(stream.push(' API').direction).toBe('rtl');
    expect(stream.snapshot().locked).toBe(true);
  });

  it('locks when the detected direction equals the fallback', () => {
    const stream = createBidiStream({ strategy: 'first-strong', fallback: 'ltr' });
    const snapshot = stream.push('Hello');
    expect(snapshot.direction).toBe('ltr');
    expect(snapshot.locked).toBe(true);
  });
});

describe('security', () => {
  it('finds and sanitizes overrides', () => {
    const input = `safe${BIDI_CONTROLS.RLO}evil${BIDI_CONTROLS.PDF}`;
    const findings = findBidiControls(input);
    expect(findings).toHaveLength(2);
    expect(findings[0]?.risk).toBe('high');
    expect(sanitizeBidiControls(input).text).toBe('safeevil');
  });
});
