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
