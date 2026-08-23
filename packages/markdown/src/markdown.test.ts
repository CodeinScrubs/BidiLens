import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import MarkdownIt from 'markdown-it';
import fc from 'fast-check';
import {
  analyzeBidiMarkdown,
  createBidiMarkdownStream,
  markdownItBidi,
  rehypeBidi,
  remarkBidi
} from './index.js';
import { stablePrefixEnd } from './stream.js';
import type { Root as MdastRoot } from 'mdast';
import { CHATGPT_MIXED_DIRECTION_MARKDOWN } from '../../../scripts/fixtures/chatgpt-mixed-direction.js';

async function render(markdown: string): Promise<string> {
  return String(await unified()
    .use(remarkParse)
    .use(remarkBidi)
    .use(remarkRehype)
    .use(rehypeBidi)
    .use(rehypeStringify)
    .process(markdown));
}

function cpuMillisecondsSince(started: NodeJS.CpuUsage): number {
  const elapsed = process.cpuUsage(started);
  return (elapsed.user + elapsed.system) / 1_000;
}

describe('Markdown plugins', () => {
  it('is output-identical to unconfigured Markdown-It for an LTR-only document', () => {
    const source = '# React guide\n\nUse `npm test` in a normal English project.';
    const baseline = new MarkdownIt({ html: false }).render(source);
    const configured = new MarkdownIt({ html: false });
    markdownItBidi(configured);
    const html = configured.render(source);
    expect(html).toBe(baseline);
    expect(html).not.toContain('dir=');
    expect(html).not.toContain('data-bidilens');
  });

  it('leaves an LTR-only MDAST tree structurally unchanged', () => {
    const tree = {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Hello world' }] }]
    } as MdastRoot;
    const before = structuredClone(tree);
    remarkBidi()(tree);
    expect(tree).toEqual(before);
  });

  it('honors explicit RTL strategy and neutral fallback in every Markdown adapter', async () => {
    const forced = new MarkdownIt({ html: false });
    markdownItBidi(forced, { strategy: 'rtl' });
    expect(forced.render('Hello')).toContain('<p dir="rtl"');

    const neutral = new MarkdownIt({ html: false });
    markdownItBidi(neutral, { fallback: 'rtl' });
    expect(neutral.render('123')).toContain('dir="rtl"');

    const inherited = new MarkdownIt({ html: false });
    markdownItBidi(inherited, { inheritedDirection: 'rtl' });
    expect(inherited.render('123')).toContain('dir="rtl"');

    const html = String(await unified()
      .use(remarkParse)
      .use(remarkBidi, { inheritedDirection: 'rtl' })
      .use(remarkRehype)
      .use(rehypeBidi, { inheritedDirection: 'rtl' })
      .use(rehypeStringify)
      .process('123'));
    expect(html).toContain('dir="rtl"');
  });

  it('annotates Markdown-It paragraph tokens with content-majority direction', () => {
    const md = new MarkdownIt({ html: false });
    markdownItBidi(md);
    const html = md.render('React یک کتابخانه است.');
    expect(html).toContain('<p dir="rtl"');
    expect(html).toContain('data-bidilens-block=""');
    expect(html).toContain('class="bidilens-block"');
  });

  it('keeps the flagship Persian-majority paragraph RTL despite leading React', async () => {
    const html = await render('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('<bdi dir="ltr"');
    expect(html).toContain('>React</bdi>');
  });

  it('preserves caller alignment while adding semantic direction metadata', () => {
    const md = new MarkdownIt({ html: false });
    const originalParagraphOpen = md.renderer.rules.paragraph_open;
    md.renderer.rules.paragraph_open = (tokens, index, options, env, self) => {
      tokens[index]?.attrSet('style', 'text-align:left');
      return originalParagraphOpen
        ? originalParagraphOpen(tokens, index, options, env, self)
        : self.renderToken(tokens, index, options);
    };
    markdownItBidi(md);

    const html = md.render('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('style="text-align:left"');
    expect(html).not.toContain('text-align:right');
  });

  it('annotates Persian paragraphs', async () => {
    const html = await render('سلام دنیا');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('data-bidilens-block');
  });

  it('forces code blocks to LTR', async () => {
    const html = String(await unified()
      .use(remarkParse)
      .use(remarkBidi, { intervention: 'always' })
      .use(remarkRehype)
      .use(rehypeBidi, { intervention: 'always' })
      .use(rehypeStringify)
      .process('```ts\nconst x = 1;\n```'));
    expect(html).toContain('dir="ltr"');
    expect(html).toContain('data-bidilens-code');
  });

  it('forces display and inline math nodes to LTR without using their symbols as prose evidence', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'نتیجه فرمول ' },
            { type: 'inlineMath', value: 'E = mc^2' },
            { type: 'text', value: ' درست است.' }
          ]
        },
        { type: 'math', value: '\\int_0^\\infty e^{-x^2} dx' }
      ]
    } as unknown as MdastRoot;

    remarkBidi()(tree);

    const paragraph = tree.children[0]!;
    const inlineMath = 'children' in paragraph ? paragraph.children[1]! : undefined;
    const displayMath = tree.children[1]!;
    expect(paragraph.data?.hProperties).toMatchObject({ dir: 'rtl' });
    expect(inlineMath?.data?.hProperties).toMatchObject({
      dir: 'ltr',
      'data-bidilens-math': ''
    });
    expect(displayMath.data?.hProperties).toMatchObject({
      dir: 'ltr',
      'data-bidilens-math': ''
    });
  });

  it('handles mixed prose and inline code', async () => {
    const html = await render('فایل `src/index.ts` را باز کن.');
    expect(html).toContain('<p');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('<code');
    expect(html).toContain('data-bidilens-code');
    expect(html).toContain('src/index.ts');
  });

  it('annotates headings, lists, and blockquotes consistently', async () => {
    const html = await render('# سلام دنیا\n\n- React یک کتابخانه است\n\n> Hello world');
    expect(html).toContain('<h1');
    expect(html).toContain('<ul>');
    expect(html).toContain('<blockquote ');
    expect((html.match(/data-bidilens-block/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('dir="ltr"');
  });

  it('supports custom classes and neutral annotation', async () => {
    const html = String(await unified()
      .use(remarkParse)
      .use(remarkBidi, { blockClassName: 'custom-block', annotateNeutral: true, fallback: 'neutral' })
      .use(remarkRehype)
      .use(rehypeBidi, { blockClassName: 'custom-block', annotateNeutral: true, fallback: 'neutral' })
      .use(rehypeStringify)
      .process('… …'));
    expect(html).toContain('custom-block');
    expect(html).toContain('data-bidilens-block');
    expect(html).not.toContain('dir="neutral"');
    expect(html).toContain('data-bidilens-direction="neutral"');
    expect(html).toContain('<p');
  });

  it('annotates Markdown-It headings with the same policy', () => {
    const md = new MarkdownIt({ html: false });
    markdownItBidi(md);
    const html = md.render('# سلام دنیا');
    expect(html).toContain('<h1 dir="rtl"');
    expect(html).toContain('data-bidilens-block=""');
    expect(html).toContain('class="bidilens-block"');
    expect(html).toContain('>سلام دنیا</h1>');
  });

  it('marks Markdown-It inline and fenced code as LTR isolates', () => {
    const md = new MarkdownIt({ html: false });
    markdownItBidi(md, { intervention: 'always' });
    const html = md.render('`src/index.ts`\n\n```ts\nconst value = 1;\n```');
    expect(html).toContain('<code dir="ltr" data-bidilens-code=""');
    expect(html).toContain('class="bidilens-code"');
    expect((html.match(/data-bidilens-code/g) ?? [])).toHaveLength(2);
    expect(html).toContain('src/index.ts');
  });

  it('isolates technical and opposite runs in a real Markdown-It render', () => {
    const md = new MarkdownIt({ html: false });
    markdownItBidi(md);
    const flagship = md.render('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(flagship).toContain('<p dir="rtl" data-bidilens-block="" class="bidilens-block">');
    expect(flagship).toContain('<bdi dir="ltr"');
    expect(flagship).toContain('>React</bdi>');
    const english = md.render('The Persian word کتاب means book.');
    expect(english).toContain('<p dir="ltr"');
    expect(english).toContain('<bdi dir="rtl"');
    expect(english).toContain('>کتاب</bdi>');
  });

  it('keeps screenshot-derived medical Markdown logically ordered and mark-safe', () => {
    const md = new MarkdownIt({ html: false });
    const document = analyzeBidiMarkdown(md, CHATGPT_MIXED_DIRECTION_MARKDOWN);

    expect(document.source).toBe(CHATGPT_MIXED_DIRECTION_MARKDOWN);
    expect(document.html).toContain('>مثلاً</bdi>');
    expect(document.html).toContain('>CN X</bdi>');
    expect(document.html).toContain('>ICH:</p>');
    expect(document.html).toContain('dir="rtl"');
    // Direction/isolation metadata must not take ownership of caller layout.
    expect(document.html).not.toContain('text-align');
    expect(document.blocks.some((block) => block.text.includes('CN X') && block.direction === 'rtl')).toBe(true);
    expect(document.blocks.some((block) => block.text.includes('Uvula runs away') && block.direction === 'ltr')).toBe(true);
  });

  it('propagates caller-specific identifiers through Markdown detection and isolation', () => {
    const md = new MarkdownIt({ html: false });
    markdownItBidi(md, { technicalIdentifiers: ['InternalPlatform'] });
    const html = md.render('internalplatform \u062e\u0648\u0628 \u0627\u0633\u062a.');
    expect(html).toContain('<p dir="rtl"');
    expect(html).toContain('>internalplatform</bdi>');
  });

  it('escapes raw markup while adding isolation wrappers', () => {
    const md = new MarkdownIt({ html: false });
    markdownItBidi(md);
    const html = md.render('<img src=x onerror=alert(1)> React یک کتابخانه است.');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('dir="rtl"');
  });

  it('annotates real Markdown-It list items and blockquotes, including tight lists', () => {
    const md = new MarkdownIt({ html: false });
    markdownItBidi(md);
    const html = md.render('- React یک کتابخانه محبوب است.\n- Hello world\n\n> نتیجه نهایی تأیید شد.');
    expect(html).toContain('<li dir="rtl" data-bidilens-block="" class="bidilens-block">');
    expect(html).toContain('<li dir="ltr" data-bidilens-block="" class="bidilens-block">');
    expect(html).toContain('<blockquote dir="rtl" data-bidilens-block="" class="bidilens-block">');
    expect(html).toContain('<bdi dir="ltr"');
    expect(html).toContain('>React</bdi>');
  });

  it('applies Markdown-It custom classes and is idempotent when installed twice', () => {
    const md = new MarkdownIt({ html: false });
    const options = { blockClassName: 'custom-block', codeClassName: 'custom-code' };
    markdownItBidi(md, options);
    const firstRule = md.renderer.rules.paragraph_open;
    markdownItBidi(md, options);
    expect(md.renderer.rules.paragraph_open).toBe(firstRule);
    const html = md.render('فایل `src/index.ts` را باز کنید.');
    expect(html).toContain('class="custom-block"');
    expect(html).toContain('class="custom-code"');
    expect((html.match(/data-bidilens-block/g) ?? [])).toHaveLength(1);
    expect((html.match(/data-bidilens-code/g) ?? [])).toHaveLength(1);
  });

  it('rejects silently conflicting configuration on one Markdown-It instance', () => {
    const defaults = new MarkdownIt({ html: false });
    markdownItBidi(defaults);
    expect(() => markdownItBidi(defaults, {
      strategy: 'content-majority',
      fallback: 'ltr',
      intervention: 'auto',
      isolateInline: true
    })).not.toThrow();

    const md = new MarkdownIt({ html: false });
    markdownItBidi(md, { strategy: 'content-majority' });
    expect(() => markdownItBidi(md, { strategy: 'first-strong' }))
      .toThrow('already configured with different BidiLens options');
  });
});

describe('rich Markdown streaming', () => {
  it('reconciles AST annotations, HTML, isolation, and security exactly with batch output', () => {
    const source = [
      '# نتیجه نهایی',
      '',
      'React یک کتابخانه جاوااسکریپت بسیار محبوب است.',
      '',
      '- The Persian word کتاب means book.',
      '- فایل `src/index.ts` را باز کنید.',
      '',
      `خطر پنهان \u202Eevil است.`
    ].join('\n');
    const options = { securityMode: 'warn' as const };
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), source, options);
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }), options);
    for (const chunk of ['# نتیجه', ' نهایی\n\nReact ', 'یک کتابخانه ', 'جاوااسکریپت بسیار محبوب است.\n',
      '\n- The Persian word کتاب means book.\n- فایل `src/', 'index.ts` را باز کنید.\n\nخطر پنهان ',
      '\u202Eevil است.']) {
      session.push(chunk);
      session.getUpdate();
    }
    const final = session.finish();
    expect(final.document).toEqual(expected);
    expect(final.source).toBe(source);
    expect(final.pendingSourceRange).toBeNull();
    expect(final.finished).toBe(true);
    expect(final.document.html).toContain('dir="rtl"');
    expect(final.document.html).toContain('<bdi dir="ltr"');
    expect(final.document.blocks.some((block) => block.analysis.isolations.length > 0)).toBe(true);
    expect(final.document.security.findings.length).toBeGreaterThan(0);
    expect(final.document.ast.children.some((node) => node.bidi !== undefined)).toBe(true);
  });

  it('preserves exact LTR-only Markdown output and emits no AST intervention metadata', () => {
    const source = '# React guide\n\nUse `npm test` in a normal English project.';
    const baseline = new MarkdownIt({ html: false }).render(source);
    const document = analyzeBidiMarkdown(new MarkdownIt({ html: false }), source);
    expect(document.html).toBe(baseline);
    expect(document.html).not.toContain('data-bidilens');
    expect(document.ast.children.every((node) => node.bidi === undefined)).toBe(true);
    expect(document.blocks.every((block) => !block.intervention)).toBe(true);
    expect(document.blocks.every((block) => block.analysis.isolations.length === 0)).toBe(true);
  });

  it('keeps final direction state faithful to configured batch detection options', () => {
    const minimumOptions = { minimumStrongCharacters: 100, fallback: 'rtl' as const };
    const minimum = createBidiMarkdownStream(new MarkdownIt({ html: false }), minimumOptions);
    minimum.push('Hello');
    const minimumFinal = minimum.finish();
    expect(minimumFinal.direction.direction).toBe('rtl');
    expect(minimumFinal.document.blocks[0]?.analysis.direction).toBe('rtl');

    const firstStrongOptions = {
      strategy: 'first-strong' as const,
      excludeTechnicalTokens: false
    };
    const firstStrong = createBidiMarkdownStream(new MarkdownIt({ html: false }), firstStrongOptions);
    firstStrong.push('A ببببب');
    const firstStrongFinal = firstStrong.finish();
    expect(firstStrongFinal.direction.direction).toBe('ltr');
    expect(firstStrongFinal.document.blocks[0]?.analysis.direction).toBe('ltr');
  });

  it.each([
    ['English soft wrap', 'This is a simple English sentence\nسلام', 'ltr'],
    ['Persian soft wrap', 'این یک جمله بسیار طولانی فارسی است\nHello', 'rtl']
  ] as const)('reconciles %s as one Markdown paragraph', (_name, source, expected) => {
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(source);
    const live = session.getUpdate();
    expect(live.document.blocks).toHaveLength(1);
    expect(live.direction.direction).toBe(expected);
    expect(session.finish().direction.direction).toBe(expected);
  });

  it('reports pending source instead of reparsing the whole document on every character', () => {
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    for (const character of 'a'.repeat(8_192)) {
      session.push(character);
      session.getUpdate();
    }
    const live = session.getUpdate();
    expect(live.parseCount).toBeLessThanOrEqual(14);
    expect(live.direction.text).toHaveLength(8_192);
    expect(live.renderedThrough).toBe(8_192);
    session.push('x');
    const pending = session.getUpdate();
    expect(pending.changed).toBe(false);
    expect(pending.pendingSourceRange).toEqual({ start: 8_192, end: 8_193 });
    expect(pending.document.source).toHaveLength(8_192);
    expect(session.finish().document.source).toHaveLength(8_193);
  });

  it('keeps large pending plain-text gaps linear without extra rich parses', () => {
    const size = 32_000;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push('a'.repeat(size));
    expect(session.getUpdate().parseCount).toBe(1);
    const started = process.cpuUsage();
    for (let index = 0; index < size - 1; index += 1) {
      session.push('x');
      session.getUpdate();
    }
    const update = session.getUpdate();
    expect(update.parseCount).toBe(1);
    expect(update.pendingSourceRange).toEqual({ start: size, end: (size * 2) - 1 });
    // CPU time preserves the regression budget without turning unrelated
    // machine contention into a false failure. parseCount and the 32k
    // one-character workload retain the O(n²) alarm.
    expect(cpuMillisecondsSince(started)).toBeLessThan(3_000);
  }, 15_000);

  it('coalesces dense streamed list lines instead of reparsing every item', () => {
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    const started = process.cpuUsage();
    let update = session.getUpdate();
    for (let index = 0; index < 400; index += 1) {
      session.push(`- item ${index} سلام\n`);
      update = session.getUpdate();
    }
    expect(update.parseCount).toBeLessThanOrEqual(12);
    expect(update.direction.paragraphs.length).toBeGreaterThan(1);
    // The parse-count bound is the deterministic O(n²) alarm. Keep a separate
    // CPU ceiling with enough headroom for V8 coverage instrumentation: an
    // isolated instrumented run is about 1.25 seconds on the Windows gate.
    expect(cpuMillisecondsSince(started)).toBeLessThan(2_000);
  }, 10_000);

  it('tracks a new Markdown block correctly inside a pending checkpoint gap', () => {
    const first = 'این یک پاراگراف فارسی بسیار طولانی و روشن برای آزمایش است.';
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(first);
    const rendered = session.getUpdate();
    expect(rendered.direction.direction).toBe('rtl');

    session.push('\n\nHello');
    const pending = session.getUpdate();
    expect(pending.changed).toBe(false);
    expect(pending.pendingSourceRange).toEqual({ start: first.length, end: first.length + 7 });
    expect(pending.direction.currentParagraph.text).toBe('Hello');
    expect(pending.direction.direction).toBe('ltr');
  });

  it('retains a direction-changing prose extension when a pending blank line completes it', () => {
    const prefix = `A${' '.repeat(80)}`;
    const extension = 'سلام '.repeat(8);
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    expect(parsed.parseCount).toBe(1);

    session.push(`${extension}\n\nHello`);
    const pending = session.getUpdate();
    expect(pending.parseCount).toBe(1);
    expect(pending.pendingSourceRange).not.toBeNull();
    expect(pending.direction.paragraphs[0]).toMatchObject({
      direction: 'rtl',
      completed: true
    });
    expect(pending.direction.paragraphs[0]?.text).toContain('سلام');
    expect(pending.direction.currentParagraph).toMatchObject({ text: 'Hello', direction: 'ltr' });
  });

  it('preserves a rendered trailing blank line before pending RTL prose', () => {
    const prefix = `${'This is a deliberately long English paragraph with many letters'}${' '.repeat(100)}\n\n`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    expect(session.getUpdate().parseCount).toBe(1);

    session.push('سلام '.repeat(5).trim());
    const pending = session.getUpdate();
    expect(pending.parseCount).toBe(1);
    expect(pending.pendingSourceRange).not.toBeNull();
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(['ltr', 'rtl']);
    expect(pending.direction.currentParagraph.direction).toBe('rtl');
  });

  it.each(['\n\n\n', '\n\n\n\n', '\n\n \t\n\n\n'])(
    'coalesces pending blank-line run %j without semantic empty paragraphs',
    (separator) => {
      const prefix = `${'A long English paragraph for a parsed checkpoint.'}${' '.repeat(80)}`;
      const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
      session.push(prefix);
      session.getUpdate();
      session.push(`${separator}سلام`);
      const pending = session.getUpdate();
      expect(pending.direction.paragraphs).toHaveLength(2);
      expect(pending.direction.paragraphs[0]?.text.trimEnd())
        .toBe('A long English paragraph for a parsed checkpoint.');
      expect(pending.direction.paragraphs[1]?.text).toBe('سلام');
      expect(pending.direction.paragraphs.some((paragraph) => paragraph.text.length === 0))
        .toBe(false);
      expect(pending.direction.currentParagraph.direction).toBe('rtl');
    }
  );

  it.each([
    ['space', 'React '],
    ['tab', 'React\t'],
    ['LF', 'React\n'],
    ['CRLF', 'React\r\n']
  ])('preserves a rendered trailing %s before a pending opposite-script token', (_name, prefix) => {
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    expect(session.getUpdate().parseCount).toBe(1);

    session.push('س');
    const pending = session.getUpdate();
    expect(pending.parseCount).toBe(1);
    expect(pending.direction.currentParagraph.text).toBe(`${prefix}س`);
    expect(pending.direction.direction).toBe('rtl');
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(session.finish().document).toEqual(expected);
  });

  it('keeps pending fenced-code content LTR and reparses when the fence closes', () => {
    const prefix = '~~~ts\nconst value = 1; // a deliberately long line for checkpoint spacing';
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const rendered = session.getUpdate();
    expect(rendered.document.blocks.at(-1)?.kind).toBe('code');
    expect(rendered.direction.direction).toBe('ltr');

    const inside = '\n\nاین یک جمله فارسی بسیار طولانی و واضح داخل همان کد است';
    session.push(inside);
    const pending = session.getUpdate();
    expect(pending.changed).toBe(false);
    expect(pending.pendingSourceRange).not.toBeNull();
    expect(pending.direction.direction).toBe('ltr');
    expect(pending.direction.paragraphs).toHaveLength(1);

    session.push('\n~~~\n\nسلام دنیا');
    const closed = session.getUpdate();
    expect(closed.changed).toBe(true);
    expect(closed.pendingSourceRange).toBeNull();
    expect(closed.document.blocks.at(-1)?.kind).toBe('prose');
    expect(closed.direction.direction).toBe('rtl');
    expect(closed.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(['ltr', 'rtl']);
  });

  it('does not mistake a closed list-indented fence for an open code block', () => {
    const prefix = '- item\n\n    ~~~ts\n    code\n    ~~~';
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    expect(session.getUpdate().document.blocks.at(-1)?.kind).toBe('code');

    session.push('\n\nسلامسلامسلام');
    const revised = session.getUpdate();
    expect(revised.changed).toBe(true);
    expect(revised.pendingSourceRange).toBeNull();
    expect(revised.direction.currentParagraph.text).toBe('سلامسلامسلام');
    expect(revised.direction.direction).toBe('rtl');
  });

  it('preserves a parsed code block semantic snapshot when following prose arrives', () => {
    const prefix = '~~~txt\nسلام دنیای فارسی بسیار طولانی در یک بلاک کد\n~~~';
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    expect(parsed.direction.paragraphs).toHaveLength(1);
    expect(parsed.direction.paragraphs[0]).toMatchObject({ direction: 'ltr' });

    session.push('\n\nHello');
    const revised = session.getUpdate();
    expect(revised.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(['ltr', 'ltr']);
    expect(revised.direction.paragraphs[0]?.text).not.toContain('~~~');
    expect(revised.document.blocks[0]).toMatchObject({ kind: 'code', direction: 'ltr' });
  });

  it.each(['    ', '\t'])('keeps pending %s-indented code LTR without a rich reparse', (indent) => {
    const prefix = `${'This is a deliberately long English paragraph.'}${' '.repeat(80)}\n\n`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    expect(session.getUpdate().parseCount).toBe(1);

    session.push(`${indent}سلام سلام سلام`);
    const pending = session.getUpdate();
    expect(pending.parseCount).toBe(1);
    expect(pending.pendingSourceRange).not.toBeNull();
    expect(pending.direction.currentParagraph.direction).toBe('ltr');
    expect(analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source)
      .blocks.at(-1)).toMatchObject({ kind: 'code', direction: 'ltr' });
  });

  it('groups consecutive pending indented-code lines into one LTR block', () => {
    const prefix = `${'A long English paragraph before indented code.'}${' '.repeat(80)}\n\n`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push('    سلام سلام سلام\n    دنیا دنیا دنیا');
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs).toHaveLength(2);
    expect(pending.direction.currentParagraph.direction).toBe('ltr');
    expect(expected.blocks.at(-1)).toMatchObject({ kind: 'code', direction: 'ltr' });
  });

  it.each([
    ['spaces', '        سلام سلام'],
    ['tabs', '\t\tسلام سلام'],
    ['mixed tab columns', '    \tسلام سلام']
  ])('keeps list-contained pending indented code LTR with %s', (_name, codeLine) => {
    const prefix = `${'A long English paragraph before a nested code block.'}${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push(`\n- item\n\n${codeLine}`);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.currentParagraph.text).toBe(codeLine);
    expect(pending.direction.currentParagraph.direction).toBe('ltr');
    expect(expected.blocks.at(-1)).toMatchObject({ kind: 'code', direction: 'ltr' });
  });

  it.each([
    ['bullet → bullet', '- Hello\n    - سلام سلام سلام'],
    ['bullet → ordered', '- Hello\n    1. سلام سلام سلام'],
    ['ordered → bullet', '1. Hello\n    - سلام سلام سلام'],
    ['ordered → ordered', '1. Hello\n    1. سلام سلام سلام'],
    ['nested heading', '- Hello\n    # سلام سلام سلام'],
    ['nested blockquote', '- Hello\n    > سلام سلام سلام']
  ])('rebases pending %s structure to its list content column', (_name, section) => {
    const prefix = `${'A long English paragraph before nested list content.'}${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push(`\n${section}`);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.currentParagraph.direction).toBe('rtl');
    expect(expected.blocks.filter((block) => block.tokenType !== 'list_item_open'
      && block.tokenType !== 'blockquote_open').at(-1)).toMatchObject({ direction: 'rtl' });
  });

  it('keeps a four-space list continuation in its RTL-majority item paragraph', () => {
    const prefix = `${'A long English paragraph before list prose.'}${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    session.getUpdate();
    session.push('\n- Hello\n    سلام سلام سلام سلام سلام');
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.direction.currentParagraph.direction).toBe('rtl');
    expect(pending.direction.currentParagraph.text).toContain('Hello');
    expect(expected.blocks.filter((block) => block.tokenType === 'paragraph_open').at(-1))
      .toMatchObject({ direction: 'rtl' });
  });

  it('recognizes container-relative indented code without misreading tab padding', () => {
    const prefix = `${'A long English paragraph before a quoted code block.'}${' '.repeat(80)}\n\n`;
    const code = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    code.push(prefix);
    code.getUpdate();
    code.push('>     سلام سلام سلام');
    const codePending = code.getUpdate();
    expect(codePending.parseCount).toBe(1);
    expect(codePending.direction.currentParagraph.direction).toBe('ltr');
    expect(analyzeBidiMarkdown(new MarkdownIt({ html: false }), codePending.source)
      .blocks.at(-1)).toMatchObject({ kind: 'code', direction: 'ltr' });

    const prose = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    prose.push(prefix);
    prose.getUpdate();
    prose.push('> \tسلام سلام سلام');
    const prosePending = prose.getUpdate();
    expect(prosePending.parseCount).toBe(1);
    expect(prosePending.direction.currentParagraph.direction).toBe('rtl');
    expect(analyzeBidiMarkdown(new MarkdownIt({ html: false }), prosePending.source)
      .blocks.at(-1)).toMatchObject({ kind: 'prose', direction: 'rtl' });
  });

  it('keeps an indented soft-line continuation in its active prose paragraph', () => {
    const prefix = `این یک پاراگراف فارسی طولانی برای حفظ یک نقطه بررسی است.${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push('\n    سلام دنیا');
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs).toHaveLength(1);
    expect(pending.direction.currentParagraph.direction).toBe('rtl');
    expect(expected.blocks).toHaveLength(1);
    expect(expected.blocks[0]).toMatchObject({ kind: 'prose', direction: 'rtl' });
  });

  it('applies CommonMark ordered-list interruption rules below a checkpoint', () => {
    const prefix = `این یک پاراگراف فارسی طولانی برای بررسی فهرست ترتیبی است.${' '.repeat(80)}`;

    const continuation = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    continuation.push(prefix);
    continuation.getUpdate();
    continuation.push('\n2. Hello world');
    const continued = continuation.getUpdate();
    expect(continued.direction.paragraphs).toHaveLength(1);
    expect(continued.direction.currentParagraph.direction).toBe('rtl');
    expect(analyzeBidiMarkdown(new MarkdownIt({ html: false }), continued.source).blocks)
      .toHaveLength(1);

    const interrupt = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    interrupt.push(prefix);
    interrupt.getUpdate();
    interrupt.push('\n1. Hello world');
    const interrupted = interrupt.getUpdate();
    expect(interrupted.direction.paragraphs).toHaveLength(2);
    expect(interrupted.direction.currentParagraph.direction).toBe('ltr');
    expect(analyzeBidiMarkdown(new MarkdownIt({ html: false }), interrupted.source)
      .blocks.at(-1)).toMatchObject({ direction: 'ltr' });
  });

  it.each([
    ['list item', '- سلام سلام سلام سلام سلام\n  Hello'],
    ['explicit blockquote continuation', '> سلام سلام سلام سلام سلام\n> Hello'],
    ['lazy blockquote continuation', '> سلام سلام سلام سلام سلام\nHello']
  ])('groups a pending multi-line %s as one direction paragraph', (_name, section) => {
    const prefix = `این یک پاراگراف فارسی طولانی پیش از ساختار چندخطی است.${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push(`\n${section}`);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs).toHaveLength(2);
    expect(pending.direction.currentParagraph.direction).toBe('rtl');
    expect(expected.blocks.at(-1)).toMatchObject({ direction: 'rtl' });
  });

  it('treats an empty quoted line as a paragraph boundary inside a blockquote', () => {
    const prefix = `این یک پاراگراف فارسی طولانی پیش از نقل‌قول است.${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push('\n> سلام سلام سلام سلام سلام\n>\n> Hello world');
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(['rtl', 'rtl', 'ltr']);
    expect(expected.blocks.filter((block) => block.tokenType !== 'blockquote_open')
      .map((block) => block.direction))
      .toEqual(['rtl', 'rtl', 'ltr']);
  });

  it.each([
    ['quoted heading', '> سلام سلام سلام سلام سلام\n> # Hello world'],
    ['quoted bullet item', '> سلام سلام سلام سلام سلام\n> - Hello world'],
    ['quoted ordered item', '> سلام سلام سلام سلام سلام\n> 1. Hello world'],
    ['nested quoted heading', '> > سلام سلام سلام سلام سلام\n> > # Hello world'],
    ['nested quoted bullet item', '> > سلام سلام سلام سلام سلام\n> > - Hello world'],
    ['nested quoted ordered item', '> > سلام سلام سلام سلام سلام\n> > 1. Hello world']
  ])('classifies inner block boundaries for a pending %s', (_name, section) => {
    const prefix = `این یک پاراگراف فارسی طولانی پیش از نقل‌قول تو‌در‌تو است.${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push(`\n${section}`);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(['rtl', 'rtl', 'ltr']);
    expect(expected.blocks.filter((block) => block.tokenType !== 'blockquote_open'
      && block.tokenType !== 'list_item_open').map((block) => block.direction))
      .toEqual(['rtl', 'rtl', 'ltr']);
  });

  it.each([
    ['bullet items', '- سلام سلام سلام سلام سلام\n- Hello world'],
    ['ordered items', '1. سلام سلام سلام سلام سلام\n2. Hello world'],
    ['ATX headings', '# سلام سلام سلام سلام سلام\n# Hello world']
  ])('separates consecutive pending %s incrementally', (_name, section) => {
    const prefix = `این یک پاراگراف فارسی طولانی پیش از چند بلاک است.${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push(`\n${section}`);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(['rtl', 'rtl', 'ltr']);
    expect(pending.direction.currentParagraph.direction).toBe('ltr');
    expect(expected.blocks.filter((block) => block.tokenType !== 'list_item_open'
      && block.tokenType !== 'blockquote_open').map((block) => block.direction))
      .toEqual(['rtl', 'rtl', 'ltr']);
  });

  it('keeps an unfinished ATX prefix reversible until its line is unambiguous', () => {
    const prefix = `این یک پاراگراف فارسی طولانی برای بررسی عنوان ناتمام است.${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();

    session.push('\n#');
    const ambiguous = session.getUpdate();
    expect(ambiguous.parseCount).toBe(parsed.parseCount);
    expect(ambiguous.direction.paragraphs).toHaveLength(1);
    expect(ambiguous.direction.currentParagraph.direction).toBe('rtl');

    session.push('###### Hello');
    const invalidated = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), invalidated.source);
    expect(invalidated.parseCount).toBe(parsed.parseCount);
    expect(invalidated.direction.paragraphs).toHaveLength(1);
    expect(invalidated.direction.currentParagraph.direction).toBe('rtl');
    expect(expected.blocks).toHaveLength(1);
    expect(expected.blocks[0]).toMatchObject({ tokenType: 'paragraph_open', direction: 'rtl' });
  });

  it.each([
    ['bullet list', '- Hello world'],
    ['ordered list', '1. Hello world'],
    ['ATX heading', '# Hello world'],
    ['blockquote', '> Hello world']
  ])('separates a pending %s that may interrupt active prose', (_name, line) => {
    const prefix = `این یک پاراگراف فارسی طولانی برای بررسی وقفه ساختاری است.${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    session.getUpdate();
    session.push(`\n${line}`);
    const pending = session.getUpdate();
    expect(pending.direction.paragraphs).toHaveLength(2);
    expect(pending.direction.currentParagraph.direction).toBe('ltr');
    expect(analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source)
      .blocks.at(-1)).toMatchObject({ direction: 'ltr' });
  });

  it('keeps a pending setext underline attached to its heading text', () => {
    const prefix = `این یک عنوان فارسی طولانی و روشن برای بررسی است${' '.repeat(80)}`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    session.getUpdate();
    session.push('\n---');
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), pending.source);
    expect(pending.direction.paragraphs).toHaveLength(1);
    expect(pending.direction.currentParagraph.direction).toBe('rtl');
    expect(expected.blocks).toHaveLength(1);
    expect(expected.blocks[0]).toMatchObject({ tokenType: 'heading_open', direction: 'rtl' });
  });

  it.each(['***', '___', '- - -'])(
    'does not expose a pending thematic break %s as a neutral LTR paragraph',
    (delimiter) => {
      const prefix = `این یک پاراگراف فارسی طولانی پیش از خط جداکننده است.${' '.repeat(80)}`;
      const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
      session.push(prefix);
      const parsed = session.getUpdate();
      session.push(`\n${delimiter}`);
      const pending = session.getUpdate();
      expect(pending.parseCount).toBe(parsed.parseCount);
      expect(pending.direction.paragraphs).toHaveLength(1);
      expect(pending.direction.currentParagraph.direction).toBe('rtl');

      session.push('\n');
      const reconciled = session.getUpdate();
      expect(reconciled.parseCount).toBeGreaterThan(parsed.parseCount);
      expect(reconciled.direction.paragraphs).toHaveLength(1);
      expect(reconciled.direction.currentParagraph.direction).toBe('rtl');
    }
  );

  it('honors Markdown-It HTML mode without treating inline tags as block boundaries', () => {
    const prefix = `این یک پاراگراف فارسی طولانی پیش از اچ‌تی‌ام‌ال است.${' '.repeat(80)}`;

    const enabledMarkdown = new MarkdownIt({ html: true });
    const enabled = createBidiMarkdownStream(enabledMarkdown);
    enabled.push(prefix);
    const parsed = enabled.getUpdate();
    enabled.push('\n<div>Hello world from a long HTML-only block');
    const pending = enabled.getUpdate();
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs).toHaveLength(1);
    expect(pending.direction.currentParagraph.direction).toBe('rtl');
    enabled.push('\n');
    const reconciled = enabled.getUpdate();
    expect(reconciled.parseCount).toBeGreaterThan(parsed.parseCount);
    expect(reconciled.document.ast.children.at(-1)?.type).toBe('html_block');

    for (const markdown of [new MarkdownIt({ html: false }), new MarkdownIt({ html: true })]) {
      const inline = createBidiMarkdownStream(markdown);
      inline.push(prefix);
      inline.getUpdate();
      inline.push('\n<span>Hello world</span>');
      const inlinePending = inline.getUpdate();
      const expected = analyzeBidiMarkdown(markdown, inlinePending.source);
      expect(inlinePending.direction.paragraphs).toHaveLength(1);
      expect(expected.blocks).toHaveLength(1);
    }
  });

  it.each([
    ['Persian header', '| عنوان |\n| --- |\n| سلام سلام سلام سلام |\n| Hello world |',
      ['ltr', 'rtl', 'rtl', 'ltr']],
    ['English header', '| Header |\n| --- |\n| سلام سلام سلام سلام |\n| Hello world |',
      ['ltr', 'ltr', 'rtl', 'ltr']],
    ['escaped pipes', '| عنوان \\| بیشتر |\n| --- |\n| سلام \\| دنیا |\n| Hello \\| world |',
      ['ltr', 'rtl', 'rtl', 'ltr']]
  ])('streams %s table cells as independent direction paragraphs', (_name, table, directions) => {
    const prefix = `${'A long English paragraph before a streamed table.'}${' '.repeat(80)}\n\n`;
    const markdown = new MarkdownIt({ html: false });
    const session = createBidiMarkdownStream(markdown);
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push(table);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(markdown, pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(directions);
    expect(pending.direction.currentParagraph.direction).toBe('ltr');
    expect(expected.blocks.filter((block) => block.tokenType === 'th_open'
      || block.tokenType === 'td_open').map((block) => block.direction))
      .toEqual(directions.slice(1));
  });

  it('maps table-cell blocks to their enclosing source rows', () => {
    const source = '| Header | عنوان |\n| --- | --- |\n| Hello | سلام دنیا |';
    const document = analyzeBidiMarkdown(new MarkdownIt({ html: false }), source);
    const cells = document.blocks.filter((block) => block.tokenType === 'th_open'
      || block.tokenType === 'td_open');
    expect(cells.map((cell) => cell.lineRange)).toEqual([
      [0, 1],
      [0, 1],
      [2, 3],
      [2, 3]
    ]);
    for (const cell of cells) {
      expect(cell.sourceRange.end).toBeGreaterThan(cell.sourceRange.start);
      expect(source.slice(cell.sourceRange.start, cell.sourceRange.end)).toContain('|');
    }
  });

  it.each([
    [
      'a blockquote-contained table',
      '> | عنوان |\n> | --- |\n> | سلام دنیا |\n> | Hello world |'
    ],
    [
      'a nested blockquote-contained table',
      '> > | First | Second |\n> > | --- | --- |\n> > | سلام دنیا | Hello world |'
    ],
    [
      'an indented nested blockquote-contained table',
      '  > > | First | Second |\n  > > | --- | --- |\n  > > | سلام دنیا | Hello world |'
    ],
    [
      'a row with surplus cells',
      '| First | Second |\n| --- | --- |\n| سلام | دنیا | Hello world |'
    ],
    [
      'an escaped pipe at the physical end of its header',
      String.raw`| First | Second \|
| --- | --- |
| سلام دنیا | Hello world |`
    ],
    [
      'repeated backslashes before an escaped pipe',
      String.raw`| عنوان |
| --- |
| سلام دنیا \\| Hello |`
    ],
    [
      'pipe-less rows in a one-column table',
      '| Header |\n| --- |\nسلام دنیا\nHello world'
    ],
    [
      'missing cells padded to the header width',
      '| First | Second | Third |\n| --- | --- | --- |\n| سلام دنیا |\n'
    ],
    [
      'explicit empty header and body cells',
      '| First | | Third |\n| --- | --- | --- |\n| سلام دنیا ||\n'
    ],
    [
      'a leading empty body cell',
      '| First | Second |\n| --- | --- |\n| | Hello world |'
    ],
    [
      'a real NUL cell followed by synthetic empty cells',
      '| First | Second | Third |\n| --- | --- | --- |\n| \u0000 | |\n'
    ],
    [
      'empty cells across multiple pending tables',
      '| First | Second |\n| --- | --- |\n| | Hello |\n\n'
        + '| Third | Fourth |\n| --- | --- |\n| سلام دنیا | |'
    ],
    [
      'a heading that terminates a table',
      '| عنوان |\n| --- |\n| سلام دنیا |\n# | Hello world |'
    ],
    [
      'a blockquote that terminates a top-level table',
      '| عنوان |\n| --- |\n| سلام دنیا |\n> | Hello world |'
    ],
    [
      'a list that terminates a table',
      '| عنوان |\n| --- |\n| سلام دنیا |\n- | Hello world |'
    ]
  ])('matches batch block directions below a checkpoint for %s', (_name, section) => {
    const prefix = `${'A long English paragraph before streamed Markdown.'}${' '.repeat(400)}\n\n`;
    const markdown = new MarkdownIt({ html: false });
    const session = createBidiMarkdownStream(markdown);
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push(section);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(markdown, pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(expected.blocks
        .filter((block) => block.tokenType !== 'blockquote_open'
          && block.tokenType !== 'list_item_open')
        .map((block) => block.direction));
    expect(pending.direction.currentParagraph.direction)
      .toBe(expected.blocks.at(-1)?.direction);
    expect(pending.direction.paragraphs.every((paragraph) =>
      !paragraph.text.includes('\u0000')
      && !paragraph.text.includes('\uFFFC'))).toBe(true);
  });

  it.each([
    ['an unterminated delimiter line', ''],
    ['a delimiter followed by a line ending', '\n']
  ])('continues a parsed header-only table after %s', (_name, suffix) => {
    const first = 'First '.repeat(30).trim();
    const second = 'Second '.repeat(30).trim();
    const initial = `| ${first} | ${second} |\n| --- | --- |${suffix}`;
    const continuation = `${suffix ? '' : '\n'}| سلام دنیا | Hello world |`;
    const markdown = new MarkdownIt({ html: false });
    const session = createBidiMarkdownStream(markdown);
    session.push(initial);
    const parsed = session.getUpdate();
    session.push(continuation);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(markdown, pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(expected.blocks.map((block) => block.direction));
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.text))
      .toEqual(expected.blocks.map((block) => block.text));
  });

  it.each([
    ['a nonempty first cell', '| Hello world | سلام دنیا |'],
    ['an empty first cell', '| | Hello world |']
  ])('starts %s cleanly after a parsed completed table row', (_name, continuation) => {
    const initial = '| First | Second |\n| --- | --- |\n| سلام دنیا | Hello world |\n';
    const markdown = new MarkdownIt({ html: false });
    const session = createBidiMarkdownStream(markdown);
    session.push(initial);
    const parsed = session.getUpdate();
    session.push(continuation);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(markdown, pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.text))
      .toEqual(expected.blocks.map((block) => block.text));
    expect(pending.direction.paragraphs.flatMap((paragraph) => [...paragraph.text]))
      .not.toContain('\uFFFC');
  });

  it('normalizes real NUL table content without exposing empty-cell markers', () => {
    const prefix = `${'A long English paragraph before streamed Markdown.'}${' '.repeat(400)}\n\n`;
    const section = '| First | Second | Third |\n| --- | --- | --- |\n| \u0000 | |\n';
    const markdown = new MarkdownIt({ html: false });
    const session = createBidiMarkdownStream(markdown);
    session.push(prefix);
    session.getUpdate();
    session.push(section);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(markdown, pending.source);
    expect(pending.direction.paragraphs.slice(-3).map((paragraph) => paragraph.text))
      .toEqual(expected.blocks.slice(-3).map((block) => block.text));
    expect(pending.direction.paragraphs.flatMap((paragraph) => [...paragraph.text]))
      .not.toContain('\uFFFC');
  });

  it('does not keep table projection active after a parsed trailing blank line', () => {
    const initial = `| ${'Header '.repeat(30).trim()} |\n| --- |\n\n`;
    const continuation = 'Hello | سلام دنیا | remains one paragraph.';
    const markdown = new MarkdownIt({ html: false });
    const session = createBidiMarkdownStream(markdown);
    session.push(initial);
    const parsed = session.getUpdate();
    session.push(continuation);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(markdown, pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(expected.blocks.map((block) => block.direction));
  });

  it('does not activate table streaming for four-space-indented code', () => {
    const prefix = `${'A long English paragraph before streamed code.'}${' '.repeat(400)}\n\n`;
    const section = '    | عنوان |\n    | --- |\n    | سلام دنیا |\n    | Hello world |';
    const markdown = new MarkdownIt({ html: false });
    const session = createBidiMarkdownStream(markdown);
    session.push(prefix);
    const parsed = session.getUpdate();
    session.push(section);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(markdown, pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(expected.blocks.map((block) => block.direction));
    expect(pending.direction.currentParagraph.direction).toBe('ltr');
  });

  it.each([
    [
      'content filling the first provisional empty cell',
      '| First | Second |\n| --- | --- |\n| ',
      'سلام دنیا | Hello world |'
    ],
    [
      'a retained empty cell before later content',
      '| First | Second | Third |\n| --- | --- | --- |\n| |',
      ' سلام دنیا | Hello world |'
    ]
  ])('does not expose empty-cell markers after a checkpoint for %s', (
    _name,
    initial,
    continuation
  ) => {
    const markdown = new MarkdownIt({ html: false });
    const session = createBidiMarkdownStream(markdown);
    session.push(initial);
    const parsed = session.getUpdate();
    session.push(continuation);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(markdown, pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.text))
      .toEqual(expected.blocks.map((block) => block.text));
    expect(pending.direction.paragraphs.flatMap((paragraph) => [...paragraph.text]))
      .not.toContain('\uFFFC');
  });

  it.each([
    [
      'a top-level table',
      '| First | Second |\n| --- | --- |\n| سلام',
      ' | دنیا | Hello world |'
    ],
    [
      'a blockquote-contained table',
      '> | First | Second |\n> | --- | --- |\n> | سلام',
      ' | دنیا | Hello world |'
    ],
    [
      'a pipe-less one-column row',
      '| Header |\n| --- |\nسلام دنیا\n',
      'Hello world'
    ],
    [
      'a terminating heading',
      '| Header |\n| --- |\n| سلام دنیا |\n',
      '# | Hello world |'
    ]
  ])('restores exact table stream state after a rich checkpoint for %s', (
    _name,
    initial,
    continuation
  ) => {
    const markdown = new MarkdownIt({ html: false });
    const session = createBidiMarkdownStream(markdown);
    session.push(initial);
    const parsed = session.getUpdate();
    session.push(continuation);
    const pending = session.getUpdate();
    const expected = analyzeBidiMarkdown(markdown, pending.source);
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs.map((paragraph) => paragraph.direction))
      .toEqual(expected.blocks
        .filter((block) => block.tokenType !== 'blockquote_open'
          && block.tokenType !== 'list_item_open')
        .map((block) => block.direction));
    expect(pending.direction.currentParagraph.direction)
      .toBe(expected.blocks.at(-1)?.direction);
  });

  it('does not seed pending state from a semantic block before a terminal thematic break', () => {
    const code = 'سلام دنیای فارسی بسیار طولانی در کد';
    const prefix = `~~~txt\n${code}\n~~~\n\n---`;
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const parsed = session.getUpdate();
    expect(parsed.document.ast.children.at(-1)?.type).toBe('hr');

    session.push('سلام');
    const pending = session.getUpdate();
    expect(pending.parseCount).toBe(parsed.parseCount);
    expect(pending.direction.paragraphs[0]).toMatchObject({ direction: 'ltr' });
    expect(pending.direction.currentParagraph).toMatchObject({ direction: 'rtl' });
    expect(pending.direction.currentParagraph.text).toContain('---سلام');
  });

  it('recognizes a blockquote-relative closing fence below a checkpoint', () => {
    const prefix = '> ~~~ts\n> code code code code code code code code';
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    expect(session.getUpdate().direction.direction).toBe('ltr');

    session.push('\n> ~~~\n\nسلامسلام');
    const closed = session.getUpdate();
    expect(closed.changed).toBe(true);
    expect(closed.pendingSourceRange).toBeNull();
    expect(closed.document.blocks.at(-1)?.kind).toBe('prose');
    expect(closed.direction.direction).toBe('rtl');
  });

  it('does not commit an unterminated fence-closing prefix that later becomes content', () => {
    const prefix = '~~~ts\nconst value = 1; // deliberately long line for checkpoint spacing';
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(prefix);
    const rendered = session.getUpdate();

    session.push('\n~~~');
    const provisional = session.getUpdate();
    expect(provisional.parseCount).toBe(rendered.parseCount);
    expect(provisional.pendingSourceRange).not.toBeNull();
    expect(provisional.direction.direction).toBe('ltr');

    session.push('x\n\nسلامسلامسلام');
    const stillOpen = session.getUpdate();
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), stillOpen.source);
    expect(stillOpen.document.blocks.at(-1)?.kind).toBe('code');
    expect(stillOpen.direction.direction).toBe('ltr');
    expect(session.finish().document).toEqual(expected);
  });

  it('marks only conservative plain-paragraph prefixes stable', () => {
    const first = 'این یک پاراگراف ساده و پایدار است.\n\n';
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push(first);
    const initial = session.getUpdate();
    expect(initial.stableThrough).toBe(first.length);
    const completed = structuredClone(initial.document.blocks[0]);
    session.push('- React یک کتابخانه محبوب است.\n- Hello world'.repeat(2));
    const live = session.getUpdate();
    expect(live.document.blocks[0]).toEqual(completed);
    expect(live.dirtyRegions[0]?.start).toBeGreaterThanOrEqual(first.length);
  });

  it('scans many stable paragraphs without restarting the block search', () => {
    const paragraph = 'سلام\n\n';
    const count = 2_000;
    const source = paragraph.repeat(count);
    const blocks = Array.from({ length: count }, (_, index) => {
      const start = index * paragraph.length;
      return {
        sourceRange: { start, end: start + paragraph.length - 1 },
        intervention: true
      };
    });
    let indexedReads = 0;
    const instrumentedBlocks = new Proxy(blocks, {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/u.test(property)) indexedReads += 1;
        return Reflect.get(target, property, receiver);
      }
    });

    expect(stablePrefixEnd(source, { blocks: instrumentedBlocks } as never)).toBe(source.length);
    expect(indexedReads).toBeLessThan(count * 5);
  });

  it('does not freeze annotation-free LTR blocks or miss retroactive reference-link changes', () => {
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    const prefix = 'Read [the guide][docs] before continuing.\n\n';
    session.push(prefix);
    const unresolved = session.getUpdate();
    expect(unresolved.stableThrough).toBe(0);
    expect(unresolved.document.html).toContain('[the guide][docs]');
    session.push('[docs]: https://example.com/documentation\n'.repeat(3));
    const resolved = session.getUpdate();
    expect(resolved.document.html).toContain('href="https://example.com/documentation"');
    expect(resolved.dirtyRegions[0]?.start).toBe(0);
    expect(session.finish().stableThrough).toBe(session.finish().source.length);
  });

  it('returns security deltas without changing the logical source', () => {
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }), { securityMode: 'strict' });
    session.push('Safe English paragraph.');
    session.getUpdate();
    const unsafe = '\n\nمتن \u202Eevil کنترل پنهان دارد.'.repeat(3);
    session.push(unsafe);
    const update = session.getUpdate();
    expect(update.source).toBe(`Safe English paragraph.${unsafe}`);
    expect(update.securityDelta.added.some((finding) => finding.code === 'BIDI_OVERRIDE_CONTROL')).toBe(true);
    expect(update.document.security.shouldBlock).toBe(true);
  });

  it.each([
    ['LF', 'سلام دنیا\n\nHello world'],
    ['CRLF', 'سلام دنیا\r\n\r\nHello world'],
    ['CR', 'سلام دنیا\r\rHello world']
  ])('maps Markdown block ranges through %s line endings', (_name, source) => {
    const document = analyzeBidiMarkdown(new MarkdownIt({ html: false }), source);
    const paragraphs = document.blocks.filter((block) => block.tokenType === 'paragraph_open');
    expect(paragraphs).toHaveLength(2);
    expect(source.slice(paragraphs[0]!.sourceRange.start, paragraphs[0]!.sourceRange.end))
      .toContain('سلام دنیا');
    expect(source.slice(paragraphs[1]!.sourceRange.start, paragraphs[1]!.sourceRange.end))
      .toBe('Hello world');
  });

  it('resets replacement text atomically and rejects pushes after finishing', () => {
    const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
    session.push('old \u202Eresponse');
    session.getUpdate();
    const replacement = 'React یک کتابخانه محبوب است.';
    const reset = session.reset(replacement);
    expect(reset.source).toBe(replacement);
    expect(reset.document.source).toBe(replacement);
    expect(reset.dirtyRegions).toEqual([{ start: 0, end: replacement.length, reason: 'reset' }]);
    expect(reset.securityDelta.removed.some((finding) => finding.code === 'BIDI_OVERRIDE_CONTROL')).toBe(true);
    expect(session.finish().document.html).toContain('dir="rtl"');
    expect(() => session.push('more')).toThrow('Cannot push after finish()');
  });

  it('is final-output invariant across random Markdown and Unicode chunk boundaries', () => {
    const source = [
      '# React یک عنوان فارسی است',
      '',
      'متن 😀 با [پیوند](https://example.com/path?q=1) و `src/index.ts`.',
      '',
      '```ts',
      'const value = "کتاب";',
      '```',
      '',
      '> English متن فارسی combining: ی\u0654'
    ].join('\n');
    const expected = analyzeBidiMarkdown(new MarkdownIt({ html: false }), source);
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 0, max: source.length }), { maxLength: 40 }),
      (rawBoundaries) => {
        const boundaries = [...new Set([0, ...rawBoundaries, source.length])].sort((a, b) => a - b);
        const session = createBidiMarkdownStream(new MarkdownIt({ html: false }));
        for (let index = 1; index < boundaries.length; index += 1) {
          session.push(source.slice(boundaries[index - 1], boundaries[index]));
          session.getUpdate();
        }
        expect(session.finish().document).toEqual(expected);
      }
    ), { numRuns: 40, seed: 0xB1D1 });
  });
});
