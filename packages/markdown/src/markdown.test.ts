import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { markdownItBidi, rehypeBidi, remarkBidi } from './index.js';

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
    const attributes = new Map<string, string>();
    const token = { type: 'paragraph_open', attrSet: (name: string, value: string) => attributes.set(name, value) };
    const inline = { type: 'inline', content: 'React یک کتابخانه است.', attrSet: () => undefined };
    const md = {
      renderer: {
        rules: {},
      }
    } as unknown as Parameters<typeof markdownItBidi>[0];
    markdownItBidi(md);
    const renderToken = () => '<p>';
    md.renderer.rules.paragraph_open!([token, inline], 0, {}, {}, { renderToken });
    expect(attributes.get('dir')).toBe('rtl');
    expect(attributes.has('data-bidilens-block')).toBe(true);
  });

  it('keeps the flagship Persian-majority paragraph RTL despite leading React', async () => {
    const html = await render('React یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    expect(html).toContain('dir="rtl"');
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

  it('handles mixed prose and inline code', async () => {
    const html = await render('فایل `src/index.ts` را باز کن.');
    expect(html).toContain('<p');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('<bdi');
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
    expect(html).toContain('dir="neutral"');
    expect(html).toContain('<p');
  });

  it('annotates Markdown-It headings with the same policy', () => {
    const attributes = new Map<string, string>();
    const tokens = [
      { type: 'heading_open', attrSet: (name: string, value: string) => attributes.set(name, value) },
      { type: 'inline', content: 'سلام دنیا', attrSet: () => undefined }
    ];
    const md = { renderer: { rules: {} } } as unknown as Parameters<typeof markdownItBidi>[0];
    markdownItBidi(md);
    const self = { renderToken: () => '<h1>' };
    md.renderer.rules.heading_open!(tokens, 0, {}, {}, self);
    expect(attributes.get('dir')).toBe('rtl');
    expect(attributes.get('data-bidilens-block')).toBe('');
    expect(attributes.size).toBe(2);
  });

  it('marks Markdown-It inline and fenced code as LTR isolates', () => {
    const attributes = new Map<string, string>();
    const md = {
      renderer: {
        rules: {
          code_inline: (tokens: any[], index: number) => tokens[index].content,
          fence: (tokens: any[], index: number) => tokens[index].content
        }
      }
    } as unknown as Parameters<typeof markdownItBidi>[0];
    markdownItBidi(md);
    const token = { type: 'code_inline', content: 'src/index.ts', attrSet: (name: string, value: string) => attributes.set(name, value) };
    md.renderer.rules.code_inline!([token], 0, {}, {}, { renderToken: () => '' });
    expect(attributes.get('dir')).toBe('ltr');
    expect(attributes.get('data-bidilens-code')).toBe('');
    expect(md.renderer.rules.fence).toBeDefined();
    expect(md.renderer.rules.code_inline).toBeDefined();
  });
});
