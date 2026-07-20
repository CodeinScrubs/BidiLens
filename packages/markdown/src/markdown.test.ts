import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import MarkdownIt from 'markdown-it';
import { markdownItBidi, rehypeBidi, remarkBidi } from './index.js';
import type { Root as MdastRoot } from 'mdast';

async function render(markdown: string): Promise<string> {
  return String(await unified()
    .use(remarkParse)
    .use(remarkBidi)
    .use(remarkRehype)
    .use(rehypeBidi)
    .use(rehypeStringify)
    .process(markdown));
}

describe('Markdown plugins', () => {
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

  it('annotates Persian paragraphs', async () => {
    const html = await render('سلام دنیا');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('data-bidilens-block');
  });

  it('forces code blocks to LTR', async () => {
    const html = await render('```ts\nconst x = 1;\n```');
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
    markdownItBidi(md);
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
});
