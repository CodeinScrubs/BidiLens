import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import MarkdownIt from 'markdown-it';
import { createBidiStream } from '../../packages/core/src/index.js';
import { renderBidiHtml } from '../../packages/html/src/index.js';
import { markdownItBidi } from '../../packages/markdown/src/index.js';
import {
  expectBidiBlock,
  expectLogicalClipboard,
  expectLogicalSelection,
  expectTokenAtBaseStart
} from '../../packages/playwright/src/index.js';

const FLAGSHIP = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';

async function replaceToolkitFixture(page: Page): Promise<void> {
  const rendered = renderBidiHtml(FLAGSHIP, { blockClassName: 'line' });
  await page.locator('[data-case="toolkit"]').evaluate((element, html) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    const replacement = template.content.firstElementChild;
    if (!replacement) throw new Error('Missing rendered BidiLens block.');
    replacement.setAttribute('data-case', 'toolkit');
    element.replaceWith(replacement);
  }, rendered.html);
}

test.describe('flagship mixed-direction rendering', () => {
  test('compares browser defaults, naive RTL, dir=auto, and real BidiLens output', async ({ page }) => {
    await page.goto(pathToFileURL(resolve('tests/visual/flagship.html')).href);
    await replaceToolkitFixture(page);
    const toolkit = page.locator('[data-case="toolkit"]');
    await expectBidiBlock(toolkit, {
      text: FLAGSHIP,
      direction: 'rtl',
      isolations: [{ text: 'React', direction: 'ltr', kind: 'identifier', tagName: 'bdi' }]
    });
    await expect(toolkit).toHaveScreenshot('flagship-toolkit.png');
    await expect(page.locator('[data-case="auto"]')).toHaveScreenshot('flagship-auto.png');
  });

  test('keeps the technical first token on the RTL base-direction side', async ({ page }) => {
    const rendered = renderBidiHtml(FLAGSHIP, { blockClassName: 'message' });
    await page.setContent(`
      <style>
        .message { width: 760px; white-space: nowrap; font: 20px Arial, sans-serif; direction: rtl; text-align: start; }
        bdi { unicode-bidi: isolate; }
      </style>
      ${rendered.html}
    `);
    const paragraph = page.locator('.message');
    const first = paragraph.locator('bdi');
    const paragraphBox = await paragraph.boundingBox();
    const firstBox = await first.boundingBox();
    expect(paragraphBox).not.toBeNull();
    expect(firstBox).not.toBeNull();
    expect(firstBox!.x).toBeGreaterThan(paragraphBox!.x + paragraphBox!.width / 2);
    await expectTokenAtBaseStart(paragraph, 'React', 'rtl');
    await expect(paragraph).toHaveCSS('direction', 'rtl');
    await expect(first).toHaveCSS('direction', 'ltr');
  });

  test('preserves logical selection, clipboard text, and textContent exactly', async ({ page, browserName }) => {
    const rendered = renderBidiHtml(FLAGSHIP);
    const origin = 'https://bidilens.test';
    await page.route(`${origin}/clipboard`, async (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta charset="utf-8"><title>Clipboard fixture</title>'
    }));
    if (browserName === 'chromium') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    }
    await page.goto(`${origin}/clipboard`);
    await page.setContent(rendered.html);
    const block = page.locator('[data-bidilens-block]');
    await expect(block).toHaveText(FLAGSHIP);
    await expectLogicalSelection(block, FLAGSHIP);
    expect(await block.evaluate((element) => element.textContent)).toBe(FLAGSHIP);
    if (browserName === 'chromium') {
      await expectLogicalClipboard(page, block, FLAGSHIP);
    }
  });

  test('handles the English-majority mirror case and independent paragraphs', async ({ page }) => {
    const mirror = 'The Persian word کتاب means “book”.';
    const source = `${mirror}\n${FLAGSHIP}`;
    const rendered = renderBidiHtml(source);
    await page.setContent(`<style>bdi { unicode-bidi: isolate }</style>${rendered.html}`);
    const blocks = page.locator('[data-bidilens-block]');
    await expect(blocks).toHaveCount(2);
    await expect(blocks.nth(0)).toHaveAttribute('dir', 'ltr');
    await expect(blocks.nth(0).locator('bdi')).toHaveAttribute('dir', 'rtl');
    await expect(blocks.nth(1)).toHaveAttribute('dir', 'rtl');
    await expect(blocks.nth(1).locator('bdi')).toHaveAttribute('dir', 'ltr');
    expect(await page.locator('[data-bidilens-document]').evaluate((element) => element.textContent)).toBe(source);
  });

  test('settles the streamed flagship once and remains correct under dark mode and zoom', async ({ page }) => {
    const stream = createBidiStream();
    const provisional = stream.push('React');
    const settled = stream.push(' یک کتابخانه جاوااسکریپت بسیار محبوب است.');
    const finished = stream.finish();
    expect(provisional.direction).toBe('ltr');
    expect(settled.direction).toBe('rtl');
    expect(settled.locked).toBe(false);
    expect(finished.direction).toBe('rtl');

    const rendered = renderBidiHtml(finished.text, { blockClassName: 'message' });
    await page.setContent(`
      <style>
        html { background: #18181b; color: #fafafa; zoom: 1.5; }
        .message { width: 520px; font: 18px Arial, sans-serif; text-align: start; }
        bdi { unicode-bidi: isolate; }
      </style>
      ${rendered.html}
    `);
    const message = page.locator('.message');
    await expect(message).toHaveCSS('direction', 'rtl');
    await expect(message).toHaveCSS('text-align', 'start');
    expect(await message.evaluate((element) => element.textContent)).toBe(FLAGSHIP);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(24, 24, 27)');
  });

  test('renders structured Markdown blocks and code with independent directions', async ({ page }) => {
    const source = [
      '# React یک کتابخانه بسیار محبوب است.',
      '',
      '- API یک رابط برنامه‌نویسی کاربردی است.',
      '- The Persian word کتاب means book.',
      '',
      '> React یک کتابخانه بسیار محبوب است.',
      '',
      '| Feature | توضیح |',
      '| --- | --- |',
      '| streaming | پردازش جریانی بسیار سریع است |',
      '',
      'مسیر فایل `src/app.ts` در پروژه قرار دارد.',
      '',
      '```ts',
      'const message = "سلام";',
      '```'
    ].join('\n');
    const markdown = new MarkdownIt({ html: false });
    markdownItBidi(markdown);
    const html = markdown.render(source);
    await page.setContent(`
      <style>
        body { margin: 20px; background: #fff; color: #171717; font: 16px/1.55 Arial, sans-serif; }
        #fixture { width: 720px; border: 1px solid #d4d4d4; padding: 18px; }
        [data-bidilens-block] { text-align: start; }
        bdi, code, pre { unicode-bidi: isolate; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #aaa; padding: 6px; }
        pre { background: #f5f5f5; padding: 10px; }
      </style>
      <main id="fixture">${html}</main>
    `);

    const fixture = page.locator('#fixture');
    await expect(fixture.locator('h1')).toHaveAttribute('dir', 'rtl');
    await expect(fixture.locator('li').nth(0)).toHaveAttribute('dir', 'rtl');
    await expect(fixture.locator('li').nth(1)).toHaveAttribute('dir', 'ltr');
    await expect(fixture.locator('blockquote')).toHaveAttribute('dir', 'rtl');
    await expect(fixture.locator('tbody td').nth(1)).toHaveAttribute('dir', 'rtl');
    await expect(fixture.locator('[data-bidilens-code]')).toHaveCount(2);
    for (const code of await fixture.locator('[data-bidilens-code]').all()) {
      await expect(code).toHaveAttribute('dir', 'ltr');
    }
    expect(await fixture.locator('h1').textContent()).toBe('React یک کتابخانه بسیار محبوب است.');
    await expect(fixture).toHaveScreenshot('structured-markdown.png');
  });
});
