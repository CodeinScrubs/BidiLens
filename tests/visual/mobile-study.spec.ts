import { test, expect, type Locator } from '@playwright/test';
import MarkdownIt from 'markdown-it';
import { renderBidiHtml } from '../../packages/html/src/index.js';
import { markdownItBidi } from '../../packages/markdown/src/index.js';
import { MOBILE_MEDICAL_MARKDOWN, MOBILE_QUERY_MARKDOWN, MOBILE_STUDY_CASES, QUERY_LITERALS } from '../../scripts/fixtures/chatgpt-mobile-oct2.js';
import { expectLogicalSelection, readLogicalSelection } from '../../packages/playwright/src/index.js';

const STYLE = '<style>body { margin:20px; font:18px/1.8 Arial,sans-serif; background:#101014; color:#f5f5f5; } main { width:350px; text-align:left; } p { margin:0 0 20px; } bdi,code,pre { unicode-bidi:isolate; } pre { white-space:pre-wrap; } blockquote { margin-inline:0; }</style>';
test.use({ viewport: { width: 390, height: 844 } });

// Reading-order start is relative to the actual first line, not the control's
// edge: a short RTL sentence may intentionally sit at the physical left edge.
async function expectTokenAtReadingEdge(block: Locator, token: string, direction: 'ltr' | 'rtl', edge: 'start' | 'end' = 'start'): Promise<void> {
  const geometry = await block.evaluate((element, { length, edge }) => {
    const start = edge === 'start' ? 0 : (element.textContent?.length ?? 0) - length;
    const end = start + length;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const rectangles: Array<{ left: number; right: number; top: number }> = [];
    let tokenStart: { node: Text; offset: number } | undefined;
    let tokenEnd: { node: Text; offset: number } | undefined;
    let cursor = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text;
      if (!tokenStart && cursor <= start && cursor + text.length > start) tokenStart = { node: text, offset: start - cursor };
      if (!tokenEnd && cursor < end && cursor + text.length >= end) tokenEnd = { node: text, offset: end - cursor };
      for (let offset = 0; offset < text.length; offset += 1) {
        if (/\s/u.test(text.data[offset]!)) continue;
        const range = document.createRange(); range.setStart(text, offset); range.setEnd(text, offset + 1);
        const rectangle = range.getBoundingClientRect();
        rectangles.push({ left: rectangle.left, right: rectangle.right, top: rectangle.top });
      }
      cursor += text.length;
    }
    if (!tokenStart || !tokenEnd) throw new Error('Boundary token not found.');
    const range = document.createRange(); range.setStart(tokenStart.node, tokenStart.offset); range.setEnd(tokenEnd.node, tokenEnd.offset);
    const tokenRect = range.getClientRects()[0]!;
    const line = rectangles.filter((rectangle) => Math.abs(rectangle.top - tokenRect.top) < 2);
    return { tokenLeft: tokenRect.left, tokenRight: tokenRect.right,
      lineLeft: Math.min(...line.map((rectangle) => rectangle.left)),
      lineRight: Math.max(...line.map((rectangle) => rectangle.right)) };
  }, { length: token.length, edge });
  const source = await block.textContent();
  expect(edge === 'start' ? source?.startsWith(token) : source?.endsWith(token)).toBe(true);
  const rightEdge = (direction === 'rtl') === (edge === 'start');
  expect(Math.abs(rightEdge ? geometry.tokenRight - geometry.lineRight : geometry.tokenLeft - geometry.lineLeft)).toBeLessThan(1);
}

test('mobile study paragraphs preserve first-token position, logical selection and host alignment', async ({ page }) => {
  for (const item of MOBILE_STUDY_CASES) {
    const result = renderBidiHtml(item.source, { inheritedDirection: 'rtl', ...item.options });
    await page.setContent(`${STYLE}<main dir="rtl">${result.html}</main>`);
    const block = page.locator('main p');
    await expect(block).toHaveCSS('direction', item.direction);
    await expect(block).toHaveCSS('text-align', 'left');
    expect(await block.textContent()).toBe(item.source);
    await expectLogicalSelection(block, item.source);
    for (const text of item.isolations ?? []) expect(await block.locator('bdi,code').allTextContents()).toContain(text);
    if (item.firstToken) await expectTokenAtReadingEdge(block, item.firstToken, item.direction);
    const punctuation = item.source.match(/[.؟]$/u)?.[0];
    if (punctuation) await expectTokenAtReadingEdge(block, punctuation, item.direction, 'end');
  }
});

test('mobile Markdown separates English formulas from Persian prose without changing text or alignment', async ({ page }) => {
  const parser = new MarkdownIt({ html: false });
  markdownItBidi(parser);
  const baseline = new MarkdownIt({ html: false }).render(MOBILE_MEDICAL_MARKDOWN);
  await page.setContent(`${STYLE}<main>${baseline}</main>`);
  const expectedText = await page.locator('main').textContent();
  const expectedSelection = await readLogicalSelection(page.locator('main'));
  await page.setContent(`${STYLE}<main>${parser.render(MOBILE_MEDICAL_MARKDOWN)}</main>`);
  const main = page.locator('main');
  expect(await main.textContent()).toBe(expectedText);
  // Native selection adds browser-specific block separators. Compare with the
  // identical baseline, not with raw Markdown or textContent's whitespace.
  await expectLogicalSelection(main, expectedSelection);
  expect(await main.locator('p').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).direction))).toEqual(['rtl', 'rtl', 'ltr', 'rtl', 'ltr', 'rtl']);
  expect(await main.locator('li').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).direction))).toEqual(['rtl', 'ltr']);
  expect(await main.locator('p').evaluateAll((elements) => elements.every((element) => getComputedStyle(element).textAlign === 'left'))).toBe(true);
  await expectTokenAtReadingEdge(main.locator('p').nth(0), 'Capsule', 'rtl');
  await expectTokenAtReadingEdge(main.locator('p').nth(3), 'Pyruvate kinase', 'rtl');
});

test('mobile query literals retain backslashes, brackets, character positions and copy order', async ({ page }) => {
  const parser = new MarkdownIt({ html: false });
  markdownItBidi(parser);
  await page.setContent(`${STYLE}<main dir="rtl">${parser.render(MOBILE_QUERY_MARKDOWN)}</main>`);
  const code = page.locator('main code');
  expect(await code.allTextContents()).toEqual([...QUERY_LITERALS, `${QUERY_LITERALS.join('\n')}\n`]);
  for (let index = 0; index < QUERY_LITERALS.length; index += 1) {
    const literal = code.nth(index);
    await expect(literal).toHaveCSS('direction', 'ltr');
    await expectLogicalSelection(literal, QUERY_LITERALS[index]!);
    const positions = await literal.evaluate((element) => {
      const node = element.firstChild!;
      return [...(element.textContent ?? '')].map((_character, offset) => {
        const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + 1);
        return range.getBoundingClientRect().x;
      });
    });
    expect(positions.every((position, offset) => offset === 0 || position >= positions[offset - 1]!)).toBe(true);
  }
  const source = `برای جستجو، ${QUERY_LITERALS[0]} را وارد کنید.`;
  await page.setContent(`${STYLE}<main>${renderBidiHtml(source).html}</main>`);
  await expect(page.locator('main code')).toHaveText(QUERY_LITERALS[0]!);
  await expectLogicalSelection(page.locator('main p'), source);
});
