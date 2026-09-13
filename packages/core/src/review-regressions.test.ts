import { describe, expect, it } from 'vitest';
import { analyzeBlock, createBidiStream, detectDirection, findTechnicalTokenRanges, planInlineIsolation, scanBidiSecurity } from './index.js';

describe('verified external review examples', () => {
  it('retains provisional first-strong evidence on a tied live token', () => {
    for (const source of ['xس', 'سx']) {
      const stream = createBidiStream({ strategy: 'majority', fallback: 'neutral' });
      for (const character of source) stream.push(character);
      expect(stream.snapshot().direction).toBe(detectDirection(source, { fallback: 'neutral' }));
      expect(stream.finish().direction).toBe(detectDirection(source, { fallback: 'neutral' }));
    }
  });
  it('keeps live math boundaries consistent with batch analysis at every prefix', () => {
    for (const source of ['$A $x$', '${HOME} $x$', '$ x$', '$x $', '$10 and $20', '$10 است و $x+1$', '$x\\$y$', '\\$x\\$', '$x$10', '$x$۱۰', '$x$١٠']) {
      for (const fallback of ['ltr', 'rtl', 'neutral'] as const) {
        const stream = createBidiStream({ strategy: 'majority', fallback });
        let prefix = '';
        for (const character of source) {
          prefix += character;
          expect(stream.push(character).direction, `${prefix} (${fallback})`).toBe(detectDirection(prefix, { fallback }));
        }
        expect(createBidiStream({ strategy: 'majority', fallback }).push(source).direction, source).toBe(detectDirection(source, { fallback }));
      }
    }
  });
  it('keeps ambiguous math/environment boundaries consistent across chunk splits', () => {
    const samples = [
      '$$x\\$$', '\\${A', '$A\\)hello$1', '$A$10hello$', '$ x$\\${A}\\${A}xسلا', '${A}$20۱۰$x$',
      '\\$$$$A', '$$hello \\$$', '${A}$20سلام$', '$20$ x$\\${A}\\سل', '$ x$$x$سل', '${A}\\${A',
      '\\)\\$$$$A', '${A};۱۰\\${A', '۱۰$20${A}\\${A', '۱۰\\${A', ' $A$10hello$', '\\$ x$$x$سل',
      '$ x$$20سلام$', '1$$\\$$10$A', '$A$\\$$$$A', '$20۱۰\\${A', '$A\\)1$10hello$', '$A$1$hello$', '$20\\(\\${A',
      '${A}\\$ x$', '$$$A$$$A', '${A}\\۱۰\\$ x$', '\\$$$$A$$$x $$', ';${A}\\$ x$', '$$hello \\$$1',
      '$$$A$$$x $$', '$$$A$$hello$', '\\${A};\\($x$', '$ x$$20سلام$2', '${A}\\${A}x$', '$$hello \\$$1$$'
    ];
    for (const source of samples) {
      for (const fallback of ['ltr', 'rtl', 'neutral'] as const) {
        const expected = detectDirection(source, { fallback });
        const stream = createBidiStream({ strategy: 'majority', fallback });
        for (const character of source) stream.push(character);
        expect(stream.snapshot().direction, `${source} (${fallback})`).toBe(expected);
        for (let split = 0; split <= source.length; split++) {
          stream.reset();
          stream.push(source.slice(0, split));
          expect(stream.push(source.slice(split)).direction, `${source} split ${split} (${fallback})`).toBe(expected);
        }
      }
    }
  });
  it('pins dollar boundary whitespace independently of host runtime predicates', () => {
    for (const space of ['\ufeff', '\u00a0', '\u202f']) {
      for (const source of [`$${space}x$`, `$x${space}$`]) {
        expect(findTechnicalTokenRanges(source).filter((range) => range.kind === 'math')).toEqual([]);
      }
    }
    for (const content of ['\u0085', '\u001c']) {
      const source = `$${content}x$`;
      expect(findTechnicalTokenRanges(source).filter((range) => range.kind === 'math').map((range) => range.text)).toEqual([source]);
    }
  });
  it('does not consume prose between currency amounts as math', () => {
    const source = 'هزینه این کتاب $10 و آن یکی $20 است.';
    expect(findTechnicalTokenRanges(source).map(({ text, kind }) => [text, kind]))
      .toEqual([['$10', 'number'], ['$20', 'number']]);
    expect(analyzeBlock(source).counts.rtl).toBe(analyzeBlock(source, { excludeTechnicalTokens: false }).counts.rtl);
  });

  it.each(['$10', '€12.50', '£25', '۱۰€', '10-20', '10–20', '-10--2', '۱۰-۲۰', '١٠-٢٠'])(
    'keeps the numeric token intact: %s', (token) => {
      const source = `مقدار ${token} است.`;
      expect(planInlineIsolation(source, 'rtl').map((range) => range.text)).toEqual([token]);
      const range = planInlineIsolation(`👋 ${source}`, 'rtl')[0]!;
      expect(`👋 ${source}`.slice(range.start, range.end)).toBe(token);
      expect(range.sourceRange.codePoint.start).toBe(range.start - 1);
    });

  it.each(['"', "'", '“', '”', '«', '»'])('excludes path quote delimiters: %s', (quote) => {
    const text = `مسیر ${quote}/usr/local/bin${quote} است.`;
    expect(findTechnicalTokenRanges(text).map((range) => range.text)).toEqual(['/usr/local/bin']);
  });

  it.each(['$ x$', '$x $', '$10 and $20', '\\$x\\$'])('rejects non-math dollar boundaries: %s', (source) => {
    expect(findTechnicalTokenRanges(source).filter((range) => range.kind === 'math')).toEqual([]);
  });

  it('retains valid math after a price and escaped delimiters inside math', () => {
    expect(findTechnicalTokenRanges('قیمت $10 است و $x+1$ درست است.').filter((range) => range.kind === 'math').map((range) => range.text))
      .toEqual(['$x+1$']);
    expect(findTechnicalTokenRanges('$x\\$y$').filter((range) => range.kind === 'math').map((range) => range.text))
      .toEqual(['$x\\$y$']);
  });

  it('retains already-correct phone, relative path, and English phrase units', () => {
    for (const token of ['+98-912-345-6789', 'src/components/Button.tsx', 'We found 3 issues in the system']) {
      expect(planInlineIsolation(`سلام ${token} تمام`, 'rtl').map((range) => range.text)).toEqual([token]);
    }
  });

  it('does not flag legitimate BOM, Persian suffix joiners, or scientific units', () => {
    for (const text of ['\ufeffhello', 'iPhone\u200cام', 'Docker\u200cاش', 'Windows\u200cتان', '50μs 10kΩ 100μm Δt λmax']) {
      expect(scanBidiSecurity(text, { mode: 'strict' })).toMatchObject({ safe: true, shouldBlock: false, findings: [] });
    }
    expect(scanBidiSecurity('safe \u202a hidden code \u202c end', { mode: 'warn' }))
      .toMatchObject({ safe: false, shouldBlock: true });
  });

  it('keeps paragraph confidence based on prose rather than a long URL', () => {
    const analysis = analyzeBlock('پاراگراف اول https://example.com/very/long/path/with/many/ascii/characters\n\nپاراگراف دوم');
    expect(analysis.confidence).toBe(1);
    expect(analysis.paragraphs.filter((paragraph) => paragraph.text).map((paragraph) => paragraph.confidence)).toEqual([1, 1]);
  });
});
