import { describe, expect, it } from 'vitest';
import {
  BIDI_CONTROLS,
  analyzeText,
  analyzePlainText,
  analyzeBlock,
  collectDirectionEvidence,
  classifyCharacter,
  createBidiStream,
  detectDirection,
  detectBaseDirection,
  findBidiControls,
  scanBidiSecurity,
  isolateText,
  sanitizeBidiControls,
  segmentDirectionalRuns,
  findDirectionalRuns,
  stripBidiControls,
  findTechnicalTokenRanges,
  needsBidiIntervention,
  planInlineIsolation
} from './index.js';

describe('direction detection', () => {
  it('provides specification-oriented aliases with identical behavior', () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    expect(detectBaseDirection(source)).toBe(detectDirection(source));
    expect(analyzePlainText(source)).toEqual(analyzeText(source));
    expect(findDirectionalRuns(source)).toEqual(segmentDirectionalRuns(source));
  });

  it('uses content-majority by default for the flagship Persian sentence', () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const analysis = analyzeText(source);
    expect(analysis.direction).toBe('rtl');
    expect(analysis.firstStrong).toBe('rtl');
    expect(analysis.rawFirstStrong).toBe('ltr');
    expect(analysis.text).toBe(source);
    expect(analysis.mixed).toBe(true);
    expect(analysis.rawCounts.ltr).toBeGreaterThan(0);
    expect(analysis.counts.ltr).toBe(0);
  });

  it('reports bidi-strong formatting marks in literal first-strong evidence', () => {
    const analysis = analyzeText('\u200fHello world');
    expect(analysis.rawFirstStrong).toBe('rtl');
    expect(analysis.firstStrong).toBe('ltr');
  });

  it('keeps an English-majority sentence LTR when it contains Persian', () => {
    expect(detectDirection('The Persian word کتاب means book.')).toBe('ltr');
  });

  it('excludes known technical identifiers from natural-language evidence', () => {
    const ranges = findTechnicalTokenRanges('React and TypeScript در یک جمله.');
    expect(ranges.map((range) => range.text)).toEqual(['React', 'TypeScript']);
    expect(detectDirection('React یک کتابخانه است.')).toBe('rtl');
  });

  it('covers unambiguous tool names and accepts caller-specific identifiers', () => {
    expect(detectDirection('Kubernetes \u062e\u0648\u0628 \u0627\u0633\u062a.')).toBe('rtl');
    expect(detectDirection('Playwright \u062e\u0648\u0628 \u0627\u0633\u062a.')).toBe('rtl');
    const customSource = 'internalplatform \u062e\u0648\u0628 \u0627\u0633\u062a.';
    expect(detectDirection(customSource)).toBe('ltr');
    expect(detectDirection(customSource, { technicalIdentifiers: ['InternalPlatform'] })).toBe('rtl');
    expect(findTechnicalTokenRanges(customSource, ['InternalPlatform']))
      .toContainEqual(expect.objectContaining({ text: 'internalplatform', kind: 'identifier' }));
    expect(planInlineIsolation(customSource, 'rtl', { technicalIdentifiers: ['InternalPlatform'] }))
      .toContainEqual(expect.objectContaining({ text: 'internalplatform', direction: 'ltr' }));
    expect(planInlineIsolation('internalplatform is healthy.', 'ltr', {
      technicalIdentifiers: ['InternalPlatform']
    })).toEqual([]);
    const mutableIdentifiers = ['InternalPlatform'];
    expect(detectDirection(customSource, { technicalIdentifiers: mutableIdentifiers })).toBe('rtl');
    mutableIdentifiers[0] = 'OtherPlatform';
    expect(detectDirection(customSource, { technicalIdentifiers: mutableIdentifiers })).toBe('ltr');
  });

  it('recognizes production technical-token categories and trims sentence punctuation', () => {
    const source = 'Claude از src/index.ts و https://example.com. با ::1، 192.168.1.1 و $NODE_ENV استفاده می‌کند.';
    const ranges = findTechnicalTokenRanges(source);
    const values = ranges.map((range) => range.text);
    expect(values).toContain('Claude');
    expect(values).toContain('src/index.ts');
    expect(values).toContain('https://example.com');
    expect(values).not.toContain('https://example.com.');
    expect(values).toContain('::1');
    expect(values).toContain('192.168.1.1');
    expect(values).toContain('$NODE_ENV');
    expect(ranges.find((range) => range.text === 'src/index.ts')?.kind).toBe('path');
    expect(findTechnicalTokenRanges('پیوند https://example.com، سپس ادامه دهید.')
      .map((range) => range.text)).toContain('https://example.com');
  });

  it('recognizes absolute paths after punctuation without swallowing delimiters', () => {
    const source = 'Open (C:\\Users\\dev\\app.ts), then check [/usr/local/bin/node].';
    const values = findTechnicalTokenRanges(source).map((range) => range.text);
    expect(values).toContain('C:\\Users\\dev\\app.ts');
    expect(values).toContain('/usr/local/bin/node');
    expect(values).not.toContain('C:\\Users\\dev\\app.ts),');
    expect(values).not.toContain('/usr/local/bin/node].');
  });

  it('rejects invalid IP candidates while isolating commands, dates, and HTML fragments', () => {
    const source = 'pnpm run build در 2026-07-18 اجرا شد؛ <span dir="ltr">ok</span> و 999.1.1.1 معتبر نیست.';
    const ranges = findTechnicalTokenRanges(source);
    expect(ranges).toContainEqual(expect.objectContaining({ text: 'pnpm run build', kind: 'command' }));
    expect(ranges).toContainEqual(expect.objectContaining({ text: '2026-07-18', kind: 'number' }));
    expect(ranges).toContainEqual(expect.objectContaining({ text: '<span dir="ltr">', kind: 'html' }));
    expect(ranges).toContainEqual(expect.objectContaining({ text: '</span>', kind: 'html' }));
    expect(ranges).not.toContainEqual(expect.objectContaining({ text: '999.1.1.1', kind: 'number' }));
  });

  it('retains configurable first-strong behavior for compatibility', () => {
    expect(detectDirection('English سلام.', { strategy: 'first-strong' })).toBe('ltr');
    expect(detectDirection('React یک کتابخانه است.', { strategy: 'strict-uax9' })).toBe('ltr');
    expect(detectDirection('React یک کتابخانه است.', { strategy: 'first-strong' })).toBe('ltr');
  });

  it('supports explicit and inherited base-direction policies', () => {
    expect(detectDirection('سلام', { strategy: 'ltr' })).toBe('ltr');
    expect(detectDirection('Hello', { strategy: 'rtl' })).toBe('rtl');
    expect(detectDirection('Hello', { strategy: 'inherit', inheritedDirection: 'rtl' })).toBe('rtl');
  });

  it('exposes auditable natural and technical evidence with dual offsets', () => {
    const source = '😀 React یک کتابخانه است.';
    const block = analyzeBlock(source);
    const react = block.evidence.find((item) => item.text === 'React')!;
    const persian = block.evidence.find((item) => item.reason === 'natural-language')!;
    expect(block.direction).toBe('rtl');
    expect(block.policy).toBe('content-majority');
    expect(react.excluded).toBe(true);
    expect(react.technicalKind).toBe('identifier');
    expect(react.sourceRange.utf16).toEqual({ start: 3, end: 8 });
    expect(react.sourceRange.codePoint).toEqual({ start: 2, end: 7 });
    expect(persian.direction).toBe('rtl');
    expect(block.isolations).toContainEqual(expect.objectContaining({ text: 'React', direction: 'ltr' }));
    expect(block.warnings).toEqual([]);
    expect(collectDirectionEvidence('React', { strategy: 'first-strong' })[0]?.excluded).toBe(false);
  });

  it('uses the pinned Unicode 17 letter data for new scripts and strategy-consistent evidence', () => {
    const sideticLetter = '\u{10940}';
    expect(classifyCharacter(sideticLetter)).toBe('rtl');
    expect(detectDirection(sideticLetter, { fallback: 'neutral' })).toBe('rtl');
    expect(analyzeBlock(sideticLetter).evidence).toEqual([
      expect.objectContaining({ text: sideticLetter, direction: 'rtl', excluded: false })
    ]);
    expect(analyzeBlock(sideticLetter, { strategy: 'strict-uax9' }).evidence).toEqual([
      expect.objectContaining({ text: sideticLetter, direction: 'rtl', excluded: false })
    ]);
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
    expect(detectDirection('2026-07-18', { inheritedDirection: 'rtl' })).toBe('rtl');
    expect(detectDirection('React یک', { excludeTechnicalTokens: false })).toBe('ltr');
  });

  it('analyzes paragraphs independently', () => {
    const result = analyzeText('Hello\nسلام');
    expect(result.paragraphs.map((paragraph) => paragraph.direction)).toEqual(['ltr', 'rtl']);
    expect(result.mixed).toBe(true);
  });
});

describe('isolation and segmentation', () => {
  it('uses a context-aware no-op gate for ordinary LTR content', () => {
    const source = 'React is a very popular JavaScript library.';
    expect(needsBidiIntervention(source)).toBe(false);
    expect(needsBidiIntervention(source, { inheritedDirection: 'ltr' })).toBe(false);
    expect(needsBidiIntervention(source, { inheritedDirection: 'rtl' })).toBe(true);
    expect(needsBidiIntervention(source, { intervention: 'always' })).toBe(true);
    expect(planInlineIsolation(source, 'ltr')).toEqual([]);
    expect(planInlineIsolation(source, 'ltr', { intervention: 'always' }).length).toBeGreaterThan(0);
    expect(analyzeBlock(source).isolations).toEqual([]);
    expect(analyzeBlock(source, { intervention: 'always' }).isolations.length).toBeGreaterThan(0);
  });

  it('never sends RTL text or hidden bidi controls through the LTR fast path', () => {
    expect(needsBidiIntervention('The Persian word کتاب means book.')).toBe(true);
    expect(needsBidiIntervention('Hello\u202E world')).toBe(true);
    expect(needsBidiIntervention('سلام دنیا')).toBe(true);
  });

  it('plans the leading technical identifier without changing source order', () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const plans = planInlineIsolation(source, 'rtl');
    expect(plans[0]).toMatchObject({ text: 'React', direction: 'ltr', kind: 'identifier', start: 0, end: 5 });
    expect(source).toBe('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
  });

  it('reports isolation ranges in UTF-16 and Unicode code-point offsets', () => {
    const plans = planInlineIsolation('😀 React یک کتابخانه است.', 'rtl');
    expect(plans[0]?.text).toBe('React');
    expect(plans[0]?.sourceRange.utf16).toEqual({ start: 3, end: 8 });
    expect(plans[0]?.sourceRange.codePoint).toEqual({ start: 2, end: 7 });
    expect(plans[0]?.start).toBe(plans[0]?.sourceRange.utf16.start);
    expect(plans[0]?.end).toBe(plans[0]?.sourceRange.utf16.end);
  });

  it('isolates technical URLs inside RTL prose', () => {
    const plans = planInlineIsolation('برای مستندات https://example.com مراجعه کنید.', 'rtl');
    expect(plans).toContainEqual(expect.objectContaining({ text: 'https://example.com', direction: 'ltr', kind: 'url' }));
  });

  it('isolates natural-language runs adjacent to technical tokens', () => {
    const plans = planInlineIsolation('שלום React library', 'rtl');
    expect(plans).toContainEqual(expect.objectContaining({ text: 'React', kind: 'identifier' }));
    expect(plans).toContainEqual(expect.objectContaining({ text: 'library', direction: 'ltr', kind: 'opposite-direction-run' }));
    expect(plans.every((plan, index) => index === 0 || plans[index - 1]!.end <= plan.start)).toBe(true);
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
  it('settles the flagship sentence from provisional LTR to revisable RTL', () => {
    const stream = createBidiStream();
    expect(stream.push('React ').direction).toBe('ltr');
    const settled = stream.push('یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(settled.direction).toBe('rtl');
    expect(settled.locked).toBe(false);
    expect(settled.text).toBe('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(stream.finish().direction).toBe('rtl');
    expect(() => stream.push(' more')).toThrow('Cannot push after finish()');
  });

  it('does not lock the English mirror case to RTL on one leading Persian word', () => {
    const stream = createBidiStream({ fallback: 'ltr' });
    const leading = stream.push('کتاب');
    expect(leading.direction).toBe('ltr');
    expect(leading.locked).toBe(false);
    const settled = stream.push(' is a common Persian word in this English sentence.');
    expect(settled.direction).toBe('ltr');
    expect(settled.locked).toBe(false);
    expect(stream.finish().direction).toBe('ltr');
  });

  it('analyzes Latin evidence symmetrically when the provisional fallback is RTL', () => {
    const stream = createBidiStream({ fallback: 'rtl' });
    expect(stream.push('Hello').locked).toBe(false);
    const settled = stream.push(' world from the browser.');
    expect(settled.direction).toBe('ltr');
    expect(settled.locked).toBe(false);
    expect(stream.finish().direction).toBe('ltr');
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

  it('keeps live first-strong direction invariant when a supplementary character is split', () => {
    const source = '\u{10940}';
    const oneChunk = createBidiStream({ strategy: 'first-strong', fallback: 'ltr' }).push(source);
    const splitStream = createBidiStream({ strategy: 'first-strong', fallback: 'ltr' });
    const pending = splitStream.push(source.slice(0, 1));
    const split = splitStream.push(source.slice(1));

    expect(pending.currentParagraph.text).toBe(source.slice(0, 1));
    expect(pending.locked).toBe(false);
    expect({ direction: split.direction, locked: split.locked })
      .toEqual({ direction: oneChunk.direction, locked: oneChunk.locked });
  });

  it('handles a pending high surrogate across finish, reset, and paragraph boundaries', () => {
    const source = '\u{10940}';
    const high = source.slice(0, 1);
    const low = source.slice(1);
    const options = { strategy: 'first-strong' as const, fallback: 'ltr' as const };

    const finishing = createBidiStream(options);
    expect(finishing.push(high).locked).toBe(false);
    expect(finishing.finish()).toMatchObject({ text: high, direction: 'ltr', locked: true, finished: true });

    const resetting = createBidiStream(options);
    resetting.push(high);
    resetting.reset();
    const lowOnly = resetting.push(low);
    const lowReference = createBidiStream(options).push(low);
    expect(lowOnly.currentParagraph.text).toBe(low);
    expect({ direction: lowOnly.direction, locked: lowOnly.locked })
      .toEqual({ direction: lowReference.direction, locked: lowReference.locked });

    const defaultSeparator = createBidiStream(options);
    defaultSeparator.push(high);
    const defaultSnapshot = defaultSeparator.push(`${low}\nA`);
    expect(defaultSnapshot.paragraphs[0]).toMatchObject({ text: source, direction: 'rtl', completed: true });
    expect(defaultSnapshot.currentParagraph).toMatchObject({ text: 'A', direction: 'ltr' });

    const customSeparator = createBidiStream({ ...options, paragraphSeparator: /\|/g });
    customSeparator.push(high);
    const customSnapshot = customSeparator.push(`${low}|A`);
    expect(customSnapshot.paragraphs).toHaveLength(1);
    expect(customSnapshot.currentParagraph).toMatchObject({ text: `${source}|A`, completed: false });
    const customFinal = customSeparator.finish();
    expect(customFinal.paragraphs[0]).toMatchObject({ text: source, direction: 'rtl', completed: true });
    expect(customFinal.currentParagraph).toMatchObject({ text: 'A', direction: 'ltr' });
  });

  it('can reset directly to replacement text without leaking finished state', () => {
    const stream = createBidiStream();
    stream.push('Hello world');
    stream.finish();
    const replacement = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    const snapshot = stream.reset(replacement);

    expect(snapshot.text).toBe(replacement);
    expect(snapshot.currentParagraph.text).toBe(replacement);
    expect(snapshot.direction).toBe('rtl');
    expect(snapshot.finished).toBe(false);
    expect(stream.push(' و کاربردی است.').text).toBe(`${replacement} و کاربردی است.`);
  });

  it('does not expose capturing separator groups as paragraphs', () => {
    const stream = createBidiStream({ paragraphSeparator: /(\n)/g });
    stream.push('Hello\nسلام');
    const snapshot = stream.finish();
    expect(snapshot.paragraphs.map((paragraph) => paragraph.text)).toEqual(['Hello', 'سلام']);
    expect(snapshot.paragraphs.map((paragraph) => paragraph.index)).toEqual([0, 1]);
    expect(snapshot.paragraphs[0]?.completed).toBe(true);
  });

  it('finalizes future-sensitive custom separators independently of chunk boundaries', () => {
    const run = (chunks: string[], paragraphSeparator: RegExp) => {
      const stream = createBidiStream({ paragraphSeparator });
      for (const chunk of chunks) stream.push(chunk);
      return stream.finish().paragraphs.map((paragraph) => paragraph.text);
    };

    expect(run(['axy'], /x(?!y)/g)).toEqual(['axy']);
    expect(run(['ax', 'y'], /x(?!y)/g)).toEqual(['axy']);
    expect(run(['axy'], /$/g)).toEqual(['axy', '']);
    expect(run(['a', 'x', 'y'], /$/g)).toEqual(['axy', '']);
    expect(run(['a😀b'], /(?=b)/gu)).toEqual(['a😀', 'b']);
    expect(run(['a\ud83d', '\ude00b'], /(?=b)/gu)).toEqual(['a😀', 'b']);
    expect(run(['a😀b'], /(?=😀)/gu)).toEqual(['a', '😀b']);
    expect(run(['a', '😀', 'b'], new RegExp('(?=😀)', 'gv'))).toEqual(['a', '😀b']);
  });

  it('does not repeatedly reparse an open paragraph for a custom separator', () => {
    const stream = createBidiStream({ paragraphSeparator: /---/g });
    const started = performance.now();
    for (let index = 0; index < 8_000; index += 1) stream.push('a');
    const elapsed = performance.now() - started;

    expect(stream.finish().currentParagraph.text).toHaveLength(8_000);
    expect(elapsed).toBeLessThan(3_000);
  });

  it('is invariant across one-chunk, code-unit, and deterministic random chunking', () => {
    const source = 'React یک کتابخانه است. 😀\r\nThe word کتاب means book.\nשלום v2.1';
    const expected = analyzeText(source, { fallback: 'ltr' });
    const chunkings: string[][] = [[source], Array.from({ length: source.length }, (_, index) => source.slice(index, index + 1))];
    for (let seed = 1; seed <= 12; seed += 1) {
      const chunks: string[] = [];
      let cursor = 0;
      let state = seed;
      while (cursor < source.length) {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        const size = 1 + (state % 7);
        chunks.push(source.slice(cursor, cursor + size));
        cursor += size;
      }
      chunkings.push(chunks);
    }
    for (const chunks of chunkings) {
      const stream = createBidiStream();
      for (const chunk of chunks) stream.push(chunk);
      const final = stream.finish();
      expect(final.text).toBe(source);
      expect(final.direction).toBe(expected.paragraphs.at(-1)?.direction);
      expect(final.paragraphs.map((paragraph) => paragraph.text)).toEqual(expected.paragraphs.map((paragraph) => paragraph.text));
      expect(final.paragraphs.map((paragraph) => paragraph.direction)).toEqual(expected.paragraphs.map((paragraph) => paragraph.direction));
      expect(final.finished).toBe(true);
    }
  });

  it('makes the live lock decision independent of caller chunk boundaries', () => {
    const source = '\u0633\u0644\u0627\u0645\u0633\u0644\u0627\u0645 hello world this is a long english sentence with many words';
    const oneChunk = createBidiStream().push(source);
    const codePointStream = createBidiStream();
    for (const character of source) codePointStream.push(character);
    const codePoints = codePointStream.snapshot();
    expect({ direction: oneChunk.direction, locked: oneChunk.locked })
      .toEqual({ direction: codePoints.direction, locked: codePoints.locked });
  });

  it('settles without freezing the default strategy at the configured evidence threshold', () => {
    const snapshot = createBidiStream().push('سلام دنیا');
    expect(snapshot.direction).toBe('rtl');
    expect(snapshot.locked).toBe(false);
  });

  it('revises a misleading RTL prefix when later evidence is English-majority', () => {
    const stream = createBidiStream();
    const prefix = stream.push('کتابخانه');
    expect(prefix).toMatchObject({ direction: 'rtl', locked: false });

    const live = stream.push(' is a common Persian word in this long English sentence.');
    expect(live).toMatchObject({ direction: 'ltr', locked: false });
    expect(stream.finish()).toMatchObject({ direction: 'ltr', locked: true });
  });

  it('rechecks policy-aware evidence after an excluded technical token flips raw evidence', () => {
    const stream = createBidiStream();
    expect(stream.push('\u0633\u0644\u0627\u0645 \u062f\u0646\u06cc\u0627').direction).toBe('rtl');
    expect(stream.push(' Kubernetes').direction).toBe('rtl');
    const live = stream.push(' is commonly used');
    expect(live.direction).toBe('ltr');
    expect(live.direction).toBe(detectDirection(live.currentParagraph.text));
    expect(stream.finish().direction).toBe('ltr');
  });

  it('rechecks opposite policy evidence after a long same-direction technical prefix', () => {
    const stream = createBidiStream();
    expect(stream.push('Hello world').direction).toBe('ltr');
    expect(stream.push(' Kubernetes'.repeat(8)).direction).toBe('ltr');
    const live = stream.push(' \u0627\u06cc\u0646 \u06cc\u06a9 \u062c\u0645\u0644\u0647 \u0641\u0627\u0631\u0633\u06cc \u0637\u0648\u0644\u0627\u0646\u06cc \u0648 \u0645\u0647\u0645 \u0627\u0633\u062a');
    expect(live.direction).toBe('rtl');
    expect(live.direction).toBe(detectDirection(live.currentParagraph.text));
    expect(stream.finish().direction).toBe('rtl');
  });

  it('does not count prose-shaped content inside completed technical structures', () => {
    for (const technical of [
      ' `ordinary prose` ',
      ' ```ordinary prose``` ',
      ' <span title="ordinary prose"> ',
      ' $ordinary prose$ ',
      ' $$ordinary prose$$ ',
      ' \\(ordinary prose\\) ',
      ' npm ordinary prose words remain arguments '
    ]) {
      const stream = createBidiStream();
      stream.push('\u0633\u0644\u0627\u0645 \u062f\u0646\u06cc\u0627');
      const live = stream.push(technical);
      expect(live.direction, technical).toBe('rtl');
      expect(live.direction, technical).toBe(detectDirection(live.currentParagraph.text));
      expect(stream.finish().direction, technical).toBe('rtl');
    }

    const commandThenPersian = createBidiStream();
    commandThenPersian.push('Hello world');
    const live = commandThenPersian.push(' npm run test, \u0627\u06cc\u0646 \u062c\u0645\u0644\u0647 \u0641\u0627\u0631\u0633\u06cc \u0637\u0648\u0644\u0627\u0646\u06cc \u0648 \u0645\u0647\u0645 \u0627\u0633\u062a ');
    expect(live.direction).toBe('rtl');
    expect(live.direction).toBe(detectDirection(live.currentParagraph.text));

    for (const opener of ['`', '<', '$']) {
      const unfinished = createBidiStream();
      const source = `\u0633\u0644\u0627\u0645 \u062f\u0646\u06cc\u0627 ${opener} this is a long English sentence with several words`;
      expect(unfinished.push(source).direction, opener).toBe(detectDirection(source));
    }
    const emptyCode = '\u0633\u0644\u0627\u0645 \u062f\u0646\u06cc\u0627 `` this is a long English sentence with several words';
    expect(createBidiStream().push(emptyCode).direction).toBe(detectDirection(emptyCode));
    const currentWord = `${'\u0633'.repeat(8)} ${'g'.repeat(9)}`;
    expect(createBidiStream().push(currentWord).direction).toBe(detectDirection(currentWord));

    const rtlPrefix = `${'\u0633'.repeat(8)} `;
    for (const tail of [
      'greetings.',
      'greetings-',
      'Kubernetes,',
      '(Kubernetes)',
      '[Kubernetes]',
      'React/Kubernetes',
      'word/Kubernetes',
      'https://example.com',
      'user@example.com',
      'C:/Users/Shayan/file.txt',
      '../src/components/Button.tsx',
      '@scope/package'
    ]) {
      const lexicalSource = `${rtlPrefix}${tail}`;
      expect(createBidiStream().push(lexicalSource).direction, tail)
        .toBe(detectDirection(lexicalSource));
    }

    const doubleDelimiter = `${rtlPrefix}\`\`ordinary English prose with many words\`\`\``;
    expect(createBidiStream().push(doubleDelimiter).direction)
      .toBe(detectDirection(doubleDelimiter));
    const tripleWithInnerTick = `${rtlPrefix}\`\`\`ordinary \` English prose with many words\`\`\``;
    expect(createBidiStream().push(tripleWithInnerTick).direction)
      .toBe(detectDirection(tripleWithInnerTick));

    const unfinishedQuotedCommand = `\u0633\u0644\u0627\u0645\u062f\u0646\u06cc\u0627 npm "ggggggggg`;
    expect(createBidiStream().push(unfinishedQuotedCommand).direction)
      .toBe(detectDirection(unfinishedQuotedCommand));

    for (const technicalBoundarySource of [
      '\u0633\u0644\u0627\u0645\u0633\u0644\u0627\u0645 C:\\Users\\foo',
      '\u0633\u0644\u0627\u0645\u0633\u0644\u0627\u0645;npm ordinary prose words remain arguments',
      '\u0633\u0644\u0627\u0645\u0633\u0644\u0627\u0645 $ABCDEFGHI',
      '\u0633\u0644\u0627\u0645\u0633\u0644\u0627\u0645 npm -x=ordinaryenglish',
      '\u0633\u0644\u0627\u0645\u0633\u0644\u0627\u0645 ```ordinary English prose`'
    ]) {
      const whole = createBidiStream().push(technicalBoundarySource);
      const codePointStream = createBidiStream();
      let codePointSnapshot = codePointStream.snapshot();
      for (const character of technicalBoundarySource) codePointSnapshot = codePointStream.push(character);
      const expected = detectDirection(technicalBoundarySource, { fallback: 'ltr' });
      expect(whole.direction, technicalBoundarySource).toBe(expected);
      expect(codePointSnapshot.direction, technicalBoundarySource).toBe(expected);
    }

    const rtlEvidence = '\u0633\u0644\u0627\u0645\u0633\u0644\u0627\u0645';
    const reviewerRegressions = [
      `src/a.ts;${rtlEvidence}`,
      `src\\a.ts;${rtlEvidence}`,
      `npm "${rtlEvidence} hello.world`,
      `npm "${rtlEvidence} @scope/pkg`,
      `npm "${rtlEvidence} go test`,
      `npm "${rtlEvidence} npm run build`,
      `npm "${rtlEvidence} https://x.test/a(b);hello`,
      `${rtlEvidence} \`\`ordinaryenglish\`\`\``,
      `${rtlEvidence} ./src/a.ts;https://x.test/(ordinaryenglish)`,
      `${rtlEvidence} C:\\src\\a.ts;https://x.test/(ordinaryenglish)`,
      `${rtlEvidence} npm run https://x.test/(abc);npm ordinaryenglishwords`,
      `${rtlEvidence} $A`,
      `${rtlEvidence} \${A}`,
      `${rtlEvidence} \\(x+1\\)`,
      `https://x.test/a(b);hello ${rtlEvidence}`,
      `npm "${rtlEvidence} hello.world" ${rtlEvidence}`,
      '$A',
      '${A}',
      '$A $A',
      '$AB $A',
      '$A ${A}',
      '$A ordinaryenglish $A',
      '\\(x+1\\)',
      'https://x.test/a(b);hello',
      '``ordinaryenglish``` npm "---- go test',
      'npm "---- go test https://x.test/a(b);hello',
      '```ordinary`` ; npm "---- @scope/pkg',
      'C:\\src\\a.ts ```ordinary`` npm "hello.world'
    ];
    for (const fallback of ['ltr', 'rtl', 'neutral'] as const) {
      for (const source of reviewerRegressions) {
        const expected = detectDirection(source, { fallback });
        expect(createBidiStream({ fallback }).push(source).direction, `${fallback}: ${source}`)
          .toBe(expected);
        const codePointStream = createBidiStream({ fallback });
        let codePointSnapshot = codePointStream.snapshot();
        for (const character of source) codePointSnapshot = codePointStream.push(character);
        expect(codePointSnapshot.direction, `${fallback}, code points: ${source}`).toBe(expected);
      }
    }

    for (const fallback of ['rtl', 'neutral'] as const) {
      for (const environment of ['$A', '$AB', '$HOME', '${A}', '${HOME}']) {
        for (const separator of [' ', ';', ',', '(', ')']) {
          const source = `${environment}${separator}$x$`;
          const options = { strategy: 'majority' as const, fallback };
          const expected = detectDirection(source, { fallback });
          expect(createBidiStream(options).push(source).direction, source).toBe(expected);
          const codePointStream = createBidiStream(options);
          let codePointSnapshot = codePointStream.snapshot();
          for (const character of source) codePointSnapshot = codePointStream.push(character);
          expect(codePointSnapshot.direction, `code points: ${source}`).toBe(expected);
        }
      }

      for (const [separator, tail] of [
        [' ', 'Kubernetes'],
        [' ', 'Kubernetes,'],
        [' ', 'hello'],
        [' ', 'hello-world'],
        [' ', 'hello.world'],
        [' ', 'me@example.com'],
        [' ', '../src/a.ts'],
        [' ', 'C:\\src\\a.ts'],
        [' ', '@scope/pkg'],
        [' ', 'go test'],
        [';', '${A}'],
        [',', '${A}'],
        ['(', '${A}'],
        [')', '${A}']
      ] as const) {
        const source = `npm run https://x.test/(abc)${separator}${tail}`;
        const options = { strategy: 'majority' as const, fallback };
        const expected = detectDirection(source, { fallback });
        const codePointStream = createBidiStream(options);
        let codePointSnapshot = codePointStream.snapshot();
        for (const character of source) codePointSnapshot = codePointStream.push(character);
        expect(codePointSnapshot.direction, `code points: ${source}`).toBe(expected);
      }

      for (const separator of [' ', ';', ',', '(', ')']) {
        const source = `npm "\u0633\u0644\u0627\u0645${separator}npm -x=ordinaryenglish`;
        const options = { strategy: 'majority' as const, fallback };
        const expected = detectDirection(source, { fallback });
        const codePointStream = createBidiStream(options);
        let codePointSnapshot = codePointStream.snapshot();
        for (const character of source) codePointSnapshot = codePointStream.push(character);
        expect(codePointSnapshot.direction, `code points: ${source}`).toBe(expected);
      }
    }
  });

  it('retains irreversible behavior only for the explicit sticky strategy', () => {
    const stream = createBidiStream({ strategy: 'sticky-majority' });
    const prefix = stream.push('کتابخانه');
    expect(prefix).toMatchObject({ direction: 'rtl', locked: true });
    expect(stream.push(' is a common Persian word in this long English sentence.'))
      .toMatchObject({ direction: 'rtl', locked: true });
  });

  it('uses caller-specific identifiers during live and final stream analysis', () => {
    const source = 'internalplatform \u062e\u0648\u0628 \u0627\u0633\u062a.';
    const stream = createBidiStream({ technicalIdentifiers: ['InternalPlatform'] });
    expect(stream.push(source).direction).toBe('rtl');
    expect(stream.finish().direction).toBe('rtl');

    for (const options of [
      { fallback: 'rtl' as const },
      { strategy: 'majority' as const, fallback: 'rtl' as const }
    ]) {
      expect(createBidiStream(options).push('Kubernetes').direction).toBe('rtl');
      expect(createBidiStream({ ...options, technicalIdentifiers: ['InternalPlatform'] })
        .push('InternalPlatform').direction).toBe('rtl');
    }
  });

  it('keeps completed paragraph snapshots protected from caller mutation', () => {
    const stream = createBidiStream();
    const first = stream.push('Hello\nسلام');
    first.paragraphs[0]!.text = 'tampered';
    expect(stream.snapshot().paragraphs[0]?.text).toBe('Hello');
  });

  it('keeps neutral, alternating-direction, and isolation workloads within linear-time budgets', () => {
    const stream = createBidiStream();
    const streamStart = performance.now();
    for (let index = 0; index < 8_000; index += 1) stream.push('.');
    expect(stream.finish().text).toHaveLength(8_000);
    expect(performance.now() - streamStart).toBeLessThan(3_000);

    const alternatingSource = `abcdefgh ${'\u0633'.repeat(11)} ${`abcdef${'\u0633'.repeat(6)} `.repeat(1_000)}`;
    const alternating = createBidiStream();
    const alternatingStart = performance.now();
    for (const character of alternatingSource) alternating.push(character);
    expect(alternating.finish().text).toBe(alternatingSource);
    expect(performance.now() - alternatingStart).toBeLessThan(3_000);

    const unfinishedCode = createBidiStream();
    const unfinishedCodeStart = performance.now();
    unfinishedCode.push(`\`${'g'.repeat(80_000)}`);
    expect(performance.now() - unfinishedCodeStart).toBeLessThan(3_000);

    const punctuationToken = createBidiStream();
    const punctuationTokenStart = performance.now();
    for (const character of `a-${'x'.repeat(16_000)}`) punctuationToken.push(character);
    expect(performance.now() - punctuationTokenStart).toBeLessThan(3_000);

    const unmatchedUrl = `https://example.com/${')'.repeat(16_000)}`;
    const unmatchedUrlStart = performance.now();
    detectDirection(unmatchedUrl);
    expect(performance.now() - unmatchedUrlStart).toBeLessThan(3_000);

    for (const delimiter of ['>', '$', '`']) {
      const delimiterStream = createBidiStream();
      const delimiterStart = performance.now();
      for (let index = 0; index < 16_000; index += 1) delimiterStream.push(delimiter);
      expect(performance.now() - delimiterStart, delimiter).toBeLessThan(3_000);
    }

    for (const completedCode of ['`code`'.repeat(2_048), '``code``'.repeat(2_048)]) {
      const completedCodeStream = createBidiStream({ strategy: 'majority', fallback: 'neutral' });
      const completedCodeStart = performance.now();
      for (const character of completedCode) completedCodeStream.push(character);
      expect(completedCodeStream.snapshot().direction).toBe(
        detectDirection(completedCode, { fallback: 'neutral' })
      );
      expect(performance.now() - completedCodeStart).toBeLessThan(3_000);
    }

    const backticks = '`'.repeat(64_000);
    const backtickBatchStart = performance.now();
    findTechnicalTokenRanges(backticks);
    expect(performance.now() - backtickBatchStart).toBeLessThan(1_500);

    const source = 'سلام React '.repeat(8_000);
    const isolationStart = performance.now();
    expect(planInlineIsolation(source, 'rtl')).toHaveLength(8_000);
    expect(performance.now() - isolationStart).toBeLessThan(3_000);
  }, 10_000);
});

describe('security', () => {
  const benignMultilingualText = [
    ['fa', 'سلام دنیا! امروز هوا خیلی خوب است.'],
    ['fa', 'لطفاً فایل config.json را در مسیر /home/user/project ذخیره کن.'],
    ['fa', 'می\u200Cخواهم دربارهٔ کتاب‌ها بخوانم.'],
    ['ar', 'مرحبا بك في موقعنا الإلكتروني. هل تحتاج إلى مساعدة؟'],
    ['ar', 'يستخدم المشروع React 19 لبناء الواجهة الجديدة.'],
    ['he', 'שלום עולם! היום יום יפה.'],
    ['he', 'אנחנו משתמשים ב-Docker כדי להריץ את היישום.'],
    ['ur', 'ہیلو دنیا! آج کا دن بہت اچھا ہے۔'],
    ['ur', 'ہم React استعمال کرتے ہیں اور قیمت 99 ڈالر ہے۔'],
    ['sd', 'اڄ موسم تمام سٺو آهي ۽ اسين ڪم جاري رکنداسين.'],
    ['ps', 'نوې نسخه په بریالیتوب خپره شوه.'],
    ['ckb', 'وەشانی نوێ بە سەرکەوتوویی بڵاوکرایەوە.'],
    ['mixed', 'The word سلام means peace in Persian.'],
    ['mixed', 'برای نصب `react-markdown` دستور `npm install react-markdown` را اجرا کنید.'],
    ['emoji', '😀 این یک پیام عادی و امن است.']
  ] as const;

  it('finds and sanitizes overrides', () => {
    const input = `safe${BIDI_CONTROLS.RLO}evil${BIDI_CONTROLS.PDF}`;
    const findings = findBidiControls(input);
    expect(findings).toHaveLength(2);
    expect(findings[0]?.risk).toBe('high');
    expect(sanitizeBidiControls(input).text).toBe('safeevil');
  });

  it('detects unbalanced controls and Trojan-Source-style overrides', () => {
    const report = scanBidiSecurity(`safe${BIDI_CONTROLS.RLO}evil`, { mode: 'strict' });
    expect(report.safe).toBe(false);
    expect(report.shouldBlock).toBe(true);
    expect(report.findings.map((finding) => finding.code)).toContain('BIDI_OVERRIDE_CONTROL');
    expect(report.findings.map((finding) => finding.code)).toContain('BIDI_UNCLOSED_EMBEDDING');
    expect(report.findings[0]?.sourceRange.utf16.start).toBe(4);
  });

  it('has no findings for ordinary Persian with ZWNJ and combining marks', () => {
    const report = scanBidiSecurity('می\u200Cخواهم دربارهٔ کتاب‌ها بخوانم.');
    expect(report.controls).toHaveLength(0);
    expect(report.findings).toHaveLength(0);
    expect(report.safe).toBe(true);
  });

  it.each(benignMultilingualText)('has no false positives for ordinary %s text', (_language, text) => {
    for (const mode of ['off', 'audit', 'warn', 'strict'] as const) {
      const report = scanBidiSecurity(text, { mode });
      expect(report.controls).toHaveLength(0);
      expect(report.findings).toHaveLength(0);
      expect(report.safe).toBe(true);
    }
  });

  it('reports unmatched pops and hidden zero-width spaces with dual offsets', () => {
    const report = scanBidiSecurity(`😀a\u200B${BIDI_CONTROLS.PDI}`);
    expect(report.findings.map((finding) => finding.code)).toContain('HIDDEN_ZERO_WIDTH_SPACE');
    expect(report.findings.map((finding) => finding.code)).toContain('BIDI_UNMATCHED_PDI');
    const hidden = report.findings.find((finding) => finding.code === 'HIDDEN_ZERO_WIDTH_SPACE')!;
    expect(hidden.sourceRange.utf16.start).toBe(3);
    expect(hidden.sourceRange.codePoint.start).toBe(2);
  });
});
