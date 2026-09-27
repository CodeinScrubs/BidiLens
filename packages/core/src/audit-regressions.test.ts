import { describe, expect, it } from 'vitest';
import { analyzeBlock, createBidiStream, detectDirection, findTechnicalTokenRanges, isolateDirectionalRuns, isolateText, planInlineIsolation, scanBidiSecurity } from './index.js';

describe('direction and recognition audit regressions', () => {
  it.each([
    ['\u2067שלום\u2069 Hello world.', 'ltr'],
    ['\u2066Hello\u2069 سلام دنیا', 'rtl'],
    ['\u2068a\u2067שלום\u2069b\u2069 سلام', 'rtl'],
    ['\u2067שלום', 'ltr'],
    ['\u2067שלום\nHello', 'ltr']
  ] as const)('strict P2 ignores isolated contents: %j', (source, expected) => {
    const options = { strategy: 'strict-uax9' as const, fallback: 'ltr' as const };
    const analysis = analyzeBlock(source, options);
    expect(analysis.direction).toBe(expected);
    expect(analysis.evidence.filter((item) => !item.excluded).some((item) => item.text.includes('שלום'))).toBe(false);
  });

  it.each(['go is a verb that means رفتن.', 'python is a language for humans زبان.', 'git is a great tool ابزار.'])(
    'does not classify ordinary English prose as a command: %s', (source) => {
      expect(findTechnicalTokenRanges(source).some((range) => range.kind === 'command')).toBe(false);
      expect(detectDirection(source)).toBe('ltr');
    });

  it.each(['npm install', 'pnpm run test', 'git status', 'go run main.go', 'python -m pip', 'node script.js'])(
    'keeps recognizable commands technical: %s', (source) => {
      expect(findTechnicalTokenRanges(source).some((range) => range.kind === 'command')).toBe(true);
    });

  it.each(['majority', 'content-majority'] as const)('honors disabled exclusion in live %s streams', (strategy) => {
    const source = 'React سلام';
    const stream = createBidiStream({ strategy, excludeTechnicalTokens: false, lockAfterStrongCharacters: 1, lockMargin: 1 });
    for (const character of source) stream.push(character);
    expect(stream.snapshot().direction).toBe(detectDirection(source, { strategy, excludeTechnicalTokens: false }));
    expect(stream.finish().direction).toBe('ltr');
  });

  it.each(['majority', 'first-strong'] as const)('retains batch command casing in live %s streams', (strategy) => {
    const source = 'Python a cat کد';
    const stream = createBidiStream({ strategy, excludeTechnicalTokens: true });
    for (const character of source) stream.push(character);
    expect(stream.snapshot().direction).toBe(detectDirection(source, { strategy, excludeTechnicalTokens: true }));
  });

  it('keeps conservative command recognition consistent at every live majority prefix', () => {
    for (const source of ['go is a verb رفتن', 'git status سلام', 'go runner سلام', 'npm ordinary prose words remain arguments', 'python -m pip سلام']) {
      const stream = createBidiStream({ strategy: 'majority', fallback: 'neutral' });
      let prefix = '';
      for (const character of source) {
        prefix += character;
        expect(stream.push(character).direction, prefix).toBe(detectDirection(prefix, { fallback: 'neutral' }));
      }
    }
  });

  it('keeps long provisional nested command arguments consistent with batch at every prefix', () => {
    for (const source of [
      `سلام node "go ${'ordinary'.repeat(8)}"`,
      `سلام node "go ${'ordinary'.repeat(8)}.js"`,
      `سلام node "git status${'ordinary'.repeat(8)}"`,
      `سلام node "git status${'ordinary'.repeat(8)}/file"`
    ]) {
      const stream = createBidiStream({ strategy: 'majority', fallback: 'neutral' });
      let prefix = '';
      for (const character of source) {
        prefix += character;
        expect(stream.push(character).direction, prefix).toBe(detectDirection(prefix, { fallback: 'neutral' }));
      }
    }
  });

  it.each(['a.'.repeat(8_000), 'a.'.repeat(8_000) + '@x', 'a.'.repeat(8_000) + '/'])(
    'bounds adversarial domain/path recognition work', (source) => {
      const started = performance.now();
      findTechnicalTokenRanges(source);
      expect(performance.now() - started).toBeLessThan(250);
    });

  it.each([
    ['.\\folder\\file', 'folder\\file'],
    ['..\\folder\\file', 'folder\\file'],
    ['-\\folder\\file', 'folder\\file'],
    ['.\\folder/file', 'folder/file'],
    ['-\\a\\Aa-', 'a\\Aa'],
    ['.\\single', undefined]
  ] as const)('retains relative paths after non-word prefix components: %s', (source, expected) => {
    const paths = findTechnicalTokenRanges(source).filter((range) => range.kind === 'path');
    expect(paths.map((range) => range.text)).toEqual(expected ? [expected] : []);
    for (const range of paths) expect(source.slice(range.start, range.end)).toBe(range.text);
  });

  it.each([
    ['a@b.com@c.de', ['a@b.com']],
    ['a@b.com@c.de@e.co', ['a@b.com', 'c.de@e.co']],
    ['ſ@domain.co', ['ſ@domain.co']],
    ['a@K.co', ['a@K.co']],
    ['a@b.ſſ', ['a@b.ſſ']],
    ['K@x.co', ['K@x.co']],
    ['a@b.co-@d.de', ['a@b.co-@d.de']]
  ] as const)('preserves non-overlapping legacy email recognition: %s', (source, expected) => {
    const emails = findTechnicalTokenRanges(source).filter((range) => range.kind === 'email');
    expect(emails.map((range) => range.text)).toEqual(expected);
    for (const range of emails) expect(source.slice(range.start, range.end)).toBe(range.text);
  });

  it('trims mixed unmatched URL closers repeatedly while retaining balanced closers', () => {
    expect(findTechnicalTokenRanges('سلام ([https://example.com)]').map((range) => range.text)).toEqual(['https://example.com']);
    expect(findTechnicalTokenRanges('سلام https://example.com/a(b)').map((range) => range.text)).toEqual(['https://example.com/a(b)']);
  });
});

describe('paragraph isolation and formatting-stack regressions', () => {
  it.each(['\n', '\r\n', '\r', '\u0085', '\u001c', '\u001d', '\u001e', '\u2029'])(
    'never scopes an inline isolate across paragraph separator %j', (separator) => {
      const source = `سلام React${separator}JavaScript`;
      const plans = planInlineIsolation(source, 'rtl');
      expect(plans.map((plan) => plan.text)).toEqual(['React', 'JavaScript']);
      let display = '';
      let cursor = 0;
      for (const plan of plans) {
        display += source.slice(cursor, plan.start) + isolateText(plan.text, plan.direction);
        expect(source.slice(plan.start, plan.end)).toBe(plan.text);
        cursor = plan.end;
      }
      display += source.slice(cursor);
      expect(scanBidiSecurity(display).findings.filter((finding) =>
        /UNMATCHED|UNCLOSED/u.test(finding.code))).toEqual([]);
      expect(scanBidiSecurity(isolateDirectionalRuns(source)).findings.filter((finding) =>
        /UNMATCHED|UNCLOSED/u.test(finding.code))).toEqual([]);
    }
  );

  it('handles deep formatting stacks with bounded synchronous work', () => {
    const count = 32_000;
    const source = '\u2066'.repeat(count) + '\u202c'.repeat(count);
    const started = performance.now();
    const findings = scanBidiSecurity(source).findings;
    const elapsed = performance.now() - started;
    expect(findings.filter((finding) => finding.code === 'BIDI_UNMATCHED_PDF')).toHaveLength(count);
    expect(findings.filter((finding) => finding.code === 'BIDI_UNCLOSED_ISOLATE')).toHaveLength(count);
    // Generous budget for shared CI; the former repeated reverse scans are quadratic.
    expect(elapsed).toBeLessThan(2_000);
  });
});
