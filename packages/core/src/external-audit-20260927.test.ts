import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PARAGRAPH_SEPARATOR_SOURCE, analyzeBlock, analyzeText, classifyCharacter, createBidiStream,
  findTechnicalTokenRanges, isolateText, planInlineIsolation, scanBidiSecurity
} from './index.js';

describe('current-checkout verification of the external 27-defect audit', () => {
  it.each([
    '1,000,000', '-1,000,000.25', '۱٬۰۰۰٬۰۰۰', '۱۲۳٫۴۵',
    '١٬٠٠٠٬٠٠٠', '١٢٣٫٤٥', '۱٬۰۰۰٬۰۰۰٫۲۵', '+۱۲۳٫۴۵',
    '50%', '۵۰٪', '+۱۲٫۵٪', '%50', '٪۵۰'
  ])('keeps a compact numeric unit intact: %s', (token) => {
    const source = `😀 مقدار ${token} است.`;
    const ranges = planInlineIsolation(source, 'rtl');
    expect(ranges.map((range) => range.text)).toEqual([token]);
    const range = ranges[0]!;
    expect(source.slice(range.start, range.end)).toBe(token);
    expect(range.sourceRange.utf16).toEqual({ start: range.start, end: range.end });
    expect(range.sourceRange.codePoint).toEqual({ start: range.start - 1, end: range.end - 1 });
    expect(findTechnicalTokenRanges(source).map((range) => range.text)).toEqual([token]);
    expect(planInlineIsolation(token, 'ltr')).toEqual([]);
  });

  it.each(['$$\nx = y\n$$', '$$\r\nx = y\r\n$$', '\\[\nx = y\n\\]', '\\[x = y\\]'])(
    'recognizes display math without crossing generated paragraph controls: %j', (math) => {
      const source = `سلام ${math} تمام`;
      expect(findTechnicalTokenRanges(source).filter((range) => range.kind === 'math').map((range) => range.text)).toEqual([math]);
      const plans = planInlineIsolation(source, 'rtl');
      expect(plans.length).toBeGreaterThan(0);
      let rendered = '';
      let cursor = 0;
      for (const plan of plans) {
        expect(source.slice(plan.start, plan.end)).toBe(plan.text);
        expect(plan.text).not.toMatch(new RegExp(DEFAULT_PARAGRAPH_SEPARATOR_SOURCE, 'u'));
        rendered += source.slice(cursor, plan.start) + isolateText(plan.text, plan.direction);
        cursor = plan.end;
      }
      rendered += source.slice(cursor);
      expect(scanBidiSecurity(rendered).findings.filter((finding) => /UNMATCHED|UNCLOSED/u.test(finding.code))).toEqual([]);
    }
  );

  it('keeps inline math newline-limited and ignores escaped or unclosed display delimiters', () => {
    for (const source of ['$x\ny$', '\\(x\ny\\)', '\\\\[x\\]', '\\[x', '$$\nx']) {
      expect(findTechnicalTokenRanges(source).filter((range) => range.kind === 'math'), source).toEqual([]);
    }
    expect(findTechnicalTokenRanges('\\[x\\] و \\[y\\]').filter((range) => range.kind === 'math').map((range) => range.text))
      .toEqual(['\\[x\\]', '\\[y\\]']);
  });

  it('bounds unmatched display delimiters and long grouped numeric candidates', () => {
    const started = performance.now();
    expect(findTechnicalTokenRanges('\\['.repeat(32_000)).filter((range) => range.kind === 'math')).toEqual([]);
    for (const separator of [',', '.', '\u066B', '\u066C']) {
      const number = `1${separator}`.repeat(16_000) + '1';
      expect(findTechnicalTokenRanges(number).map((range) => range.text)).toEqual([number]);
      expect(findTechnicalTokenRanges(`${number}x`).map((range) => range.text)).toEqual([number.slice(0, -2)]);
    }
    expect(performance.now() - started).toBeLessThan(3_000);
  });

  it.each([
    ['1,000x', ['1']], ['x1,000,000', ['x1', '000,000']], ['x-50', ['x-50']],
    ['$1,000x', ['$1']], ['x$50', ['50']], ['50$x', ['50']],
    ['%50x', []], ['x%50', ['50']], ['50%x', ['50']],
    ['1–2–3', ['1–2–3']], ['-10--2', ['-10--2']],
    ['10-20x', ['10']], ['1.2.3', ['1.2.3']],
    ['1\u{1e2ff}', ['1\u{1e2ff}']], ['\u{1e2ff}-12', ['\u{1e2ff}-12']],
    ['a\udc00$1', ['$1']], ['a\udc00€1', ['€1']]
  ])('retains numeric word boundaries and symbols: %s', (source, expected) => {
    expect(findTechnicalTokenRanges(source as string).map((range) => range.text)).toEqual(expected);
  });

  it('keeps bracket-math live decisions consistent with batch at every prefix and chunk split', () => {
    for (const source of ['سلام \\[hello world\\] تمام', 'سلام \\[hello \\) world\\] تمام', 'سلام \\(hello \\] world\\) تمام', 'سلام \\\\[hello\\] تمام', 'سلام \\[hello $x$ world\\] تمام', 'س\\[API\\]', 'س\\[foo_bar\\]', 'س\\[hello/world\\]', 'س\\[https://example.com\\]']) {
      for (const fallback of ['ltr', 'rtl', 'neutral'] as const) {
        const stream = createBidiStream({ strategy: 'majority', fallback });
        let prefix = '';
        for (const character of source) {
          prefix += character;
          expect(stream.push(character).direction, `${prefix} (${fallback})`).toBe(analyzeBlock(prefix, { fallback }).direction);
        }
        for (let split = 0; split <= source.length; split += 1) {
          stream.reset();
          stream.push(source.slice(0, split));
          expect(stream.push(source.slice(split)).direction, `${source} split ${split} (${fallback})`).toBe(analyzeBlock(source, { fallback }).direction);
        }
      }
    }
    for (const source of ['https://e.com\\]', 'س https://example.com\\[x\\]helloworld']) {
      const urlStream = createBidiStream({ strategy: 'majority', fallback: 'neutral' });
      for (const character of source) urlStream.push(character);
      expect(urlStream.snapshot().direction).toBe(analyzeBlock(source, { fallback: 'neutral' }).direction);
      for (let split = 0; split <= source.length; split += 1) {
        urlStream.reset();
        urlStream.push(source.slice(0, split));
        expect(urlStream.push(source.slice(split)).direction, `${source} split ${split}`).toBe(analyzeBlock(source, { fallback: 'neutral' }).direction);
      }
    }
  });

  it('reconciles numeric and display-math streams to batch at every chunk split', () => {
    for (const source of ['مقدار ۱٬۰۰۰٬۰۰۰ و ۵۰٪ است.', 'سلام $$\nformula = x + y\n$$ تمام', 'سلام \\[\nformula = x\n\\] تمام']) {
      for (let split = 0; split <= source.length; split += 1) {
        const stream = createBidiStream();
        stream.push(source.slice(0, split));
        stream.push(source.slice(split));
        const finished = stream.finish();
        expect(finished.text).toBe(source);
        expect(finished.paragraphs.map(({ text, direction }) => ({ text, direction })), `${source} split ${split}`)
          .toEqual(analyzeText(source, { fallback: 'ltr' }).paragraphs.map(({ text, direction }) => ({ text, direction })));
      }
    }
  });

  it('does not cache an incomplete URL scheme as a stable path', () => {
    for (const scheme of ['https', 'http', 'ftp', 'HTTPS']) {
      for (const fallback of ['ltr', 'rtl', 'neutral'] as const) {
        const source = `س ${scheme}://example.com`;
        for (let split = 0; split <= source.length; split += 1) {
          const stream = createBidiStream({ strategy: 'majority', fallback });
          stream.push(source.slice(0, split));
          expect(stream.push(source.slice(split)).direction, `${source} split ${split}`).toBe(analyzeBlock(source, { fallback }).direction);
        }
      }
    }
  });

  it('retains already-correct range, currency, path, code, and URL behavior', () => {
    for (const token of ['10-20', '2020-2024', '10–20', '$50', '50$', './src/index.ts', '~/.bashrc', '`code`']) {
      const source = `سلام ${token} تمام`;
      expect(planInlineIsolation(source, 'rtl').map((range) => range.text), token).toEqual([token]);
    }
    for (const punctuation of ['.', '?', ',', '!', ':', '،', '؛', '؟', '۔']) {
      expect(findTechnicalTokenRanges(`سلام https://example.com${punctuation}`).map((range) => range.text))
        .toEqual(['https://example.com']);
    }
    expect(findTechnicalTokenRanges('مسیر (/var/log) است.').map((range) => range.text)).toEqual(['/var/log']);
  });

  it('does not reproduce the claimed security callback or scientific-text crashes', () => {
    expect(Array.isArray(analyzeBlock('test').warnings)).toBe(true);
    for (const source of ['10 μm', '100 μs', '50 μg', 'React\u200cها']) {
      expect(scanBidiSecurity(source, { mode: 'warn' })).toMatchObject({ safe: true, shouldBlock: false, findings: [] });
    }
    for (const character of ['١', '\n', '\t', '\u200b']) expect(classifyCharacter(character)).toBe('neutral');
    const stream = createBidiStream();
    stream.push('Hello');
    const finished = stream.finish();
    expect(() => stream.push(' سلام')).toThrow('Cannot push after finish().');
    expect(stream.snapshot()).toMatchObject({ text: finished.text, finished: true, direction: finished.direction });
  });
});
