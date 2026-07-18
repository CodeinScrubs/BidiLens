import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { rehypeBidi, remarkBidi } from './index.js';

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
  });
});
