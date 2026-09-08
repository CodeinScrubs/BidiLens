import { test, expect } from '@playwright/test';
import { buildSync } from 'esbuild';
import type * as DomAdapter from '../../packages/dom/src/index.js';

const bundle = buildSync({
  entryPoints: ['packages/dom/src/index.ts'],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'iife',
  globalName: 'BidiLensDom'
}).outputFiles[0]!.text;

test('incremental DOM isolation preserves phrase order and left alignment', async ({ page }) => {
  await page.setContent('<main dir="ltr"><p id="stream" style="text-align:left">سلام page</p><p id="css" style="direction:rtl">Hello world</p></main>');
  await page.addScriptTag({ content: bundle });
  const evidence = await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    api.applyBidi(document.body);
    const paragraph = document.querySelector('#stream')!;
    paragraph.append(' 97');
    api.applyBidi(document.body);
    const isolate = paragraph.querySelector('bdi')!;
    const text = isolate.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0); range.setEnd(text, 4);
    const pageLeft = range.getBoundingClientRect().left;
    range.setStart(text, 5); range.setEnd(text, 7);
    const numberLeft = range.getBoundingClientRect().left;
    api.applyBidi(document.body);
    return { phrase: isolate.textContent, pageLeft, numberLeft,
      stable: paragraph.querySelector('bdi') === isolate,
      source: paragraph.textContent };
  });
  expect(evidence.phrase).toBe('page 97');
  expect(evidence.pageLeft).toBeLessThan(evidence.numberLeft);
  expect(evidence.stable).toBe(true);
  expect(evidence.source).toBe('سلام page 97');
  await expect(page.locator('#stream')).toHaveCSS('text-align', 'left');
  await expect(page.locator('#css')).toHaveCSS('direction', 'ltr');
});

test('honors changed author dir without losing real stylesheet precedence', async ({ page }) => {
  await page.setContent('<style>.host-direction { direction:rtl }</style><main dir="ltr"><p id="plain" dir="rtl">سلام دنیا</p><p id="styled" class="host-direction" dir="rtl">سلام دنیا</p></main>');
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    api.applyBidi(document.body);
    for (const paragraph of document.querySelectorAll('p')) {
      paragraph.dir = 'ltr';
      paragraph.textContent = '---';
    }
    api.applyBidi(document.body);
    api.applyBidi(document.body);
  });
  await expect(page.locator('#plain')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#plain')).not.toHaveAttribute('style');
  await expect(page.locator('#plain')).not.toHaveAttribute('data-bidilens-block');
  await expect(page.locator('#styled')).toHaveCSS('direction', 'rtl');
  await page.evaluate(() => {
    (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom.restoreBidi(document.body);
  });
  await expect(page.locator('#styled')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('#styled')).toHaveCSS('direction', 'rtl');
  await expect(page.locator('#styled')).not.toHaveAttribute('style');
});

test('restores case-insensitive authored auto direction after an LTR update', async ({ page }) => {
  await page.setContent('<main dir="ltr"><p dir="AUTO" style="text-align:left">سلام دنیا</p></main>');
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    api.applyBidi(document.body);
    document.querySelector('p')!.textContent = 'Hello world';
    api.applyBidi(document.body);
  });
  await expect(page.locator('p')).toHaveAttribute('dir', 'AUTO');
  await expect(page.locator('p')).not.toHaveAttribute('data-bidilens-block');
  await expect(page.locator('p')).toHaveCSS('direction', 'ltr');
  await expect(page.locator('p')).toHaveCSS('text-align', 'left');
});

test('DOM exclusions preserve nested editor content and selection while correcting adjacent prose', async ({ page }) => {
  await page.setContent(`<main>
    <p id="protected">React یک کتابخانه محبوب است.
      <span contenteditable="true" id="editor">React یک کتابخانه است.</span>
    </p>
    <p id="message" style="text-align:left">React یک کتابخانه محبوب است.</p>
    <div data-skip><code id="code">let x = 1;</code></div>
  </main>`);
  await page.addScriptTag({ content: bundle });
  const evidence = await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    const editor = document.querySelector<HTMLElement>('#editor')!;
    const block = document.querySelector<HTMLElement>('#protected')!;
    const code = document.querySelector<HTMLElement>('#code')!;
    const originalTextNode = editor.firstChild!;
    const before = block.outerHTML;
    const codeBefore = code.outerHTML;
    editor.focus();
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(originalTextNode, 0, originalTextNode, 5);
    const result = api.applyBidi(document.body, { skipSelector: '[contenteditable], [data-skip]' });
    return {
      annotated: result.annotated,
      editorUntouched: block.outerHTML === before && editor.firstChild === originalTextNode,
      codeUntouched: code.outerHTML === codeBefore,
      selectionUnchanged: selection.anchorNode === originalTextNode
        && selection.focusNode === originalTextNode && selection.anchorOffset === 0 && selection.focusOffset === 5,
      selected: selection.toString()
    };
  });
  expect(evidence).toEqual({
    annotated: 1,
    editorUntouched: true,
    codeUntouched: true,
    selectionUnchanged: true,
    selected: 'React'
  });
  await expect(page.locator('#message')).toHaveCSS('direction', 'rtl');
  await expect(page.locator('#message')).toHaveCSS('text-align', 'left');
  await expect(page.locator('#message bdi')).toHaveText('React');
});
