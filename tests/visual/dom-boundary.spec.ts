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

test('unrendered metadata cannot choose a visible paragraph base or receive isolation wrappers', async ({ page }) => {
  await page.setContent(`<style>.absent { display: none; } .force-display { display: inline !important; }</style><main style="text-align:left">
    <p id="hidden">سلام React دنیا <span hidden>This lengthy English metadata should never determine the visible language.</span></p>
    <p id="css">سلام React دنیا <span class="absent">This lengthy English metadata should never determine the visible language.</span></p>
    <p id="content-visibility">سلام React دنیا <span style="display:inline-block;content-visibility:hidden">This lengthy English metadata should never determine the visible language.</span></p>
    <p id="script">سلام React دنیا <script type="application/json">{"description":"This lengthy English metadata should never determine the visible language"}</script></p>
    <p id="until-found">سلام React دنیا <span hidden="until-found" style="display:inline-block">This lengthy English metadata should never determine the visible language.</span></p>
    <p id="inline-content-visibility">سلام دنیا <span style="content-visibility:hidden">Many ordinary English words describe a very long visible paragraph.</span></p>
    <p id="inline-list-visibility">سلام دنیا <span style="display:inline list-item;content-visibility:hidden">Many ordinary English words describe a very long visible paragraph.</span></p>
    <p id="inline-until-found">سلام دنیا <span hidden="until-found">Many ordinary English words describe a very long visible paragraph.</span></p>
    <p id="display-override">سلام دنیا <span hidden class="force-display">Many ordinary English words describe a very long visible paragraph.</span></p>
    <section hidden><p id="absent">سلام React دنیا</p></section>
  </main>`);
  await page.addScriptTag({ content: bundle });
  const evidence = await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    const root = document.querySelector('main')!;
    const entries = ['hidden', 'css', 'script', 'until-found', 'content-visibility'].map((id) => {
      const paragraph = document.getElementById(id)!;
      const metadata = paragraph.lastElementChild!;
      return { paragraph, metadata, source: paragraph.textContent, html: metadata.outerHTML, firstChild: metadata.firstChild };
    });
    const absent = document.querySelector('#absent')!;
    const absentHtml = absent.outerHTML;
    api.applyBidi(root);
    const applied = entries.map(({ paragraph, metadata, source, html, firstChild }) => ({
      direction: getComputedStyle(paragraph).direction,
      alignment: getComputedStyle(paragraph).textAlign,
      sourcePreserved: paragraph.textContent === source,
      metadataPreserved: metadata.outerHTML === html && metadata.firstChild === firstChild,
      isolated: [...paragraph.querySelectorAll('bdi')].map((node) => node.textContent)
    }));
    const untouched = absent.outerHTML === absentHtml;
    const displayOverrideDirection = getComputedStyle(document.getElementById('display-override')!).direction;
    const inlineDirections = ['inline-content-visibility', 'inline-until-found', 'inline-list-visibility'].map((id) =>
      getComputedStyle(document.getElementById(id)!).direction);
    api.restoreBidi(root);
    return { applied, untouched, displayOverrideDirection, inlineDirections, restored: entries.every(({ paragraph, metadata, source, html }) => paragraph.textContent === source && metadata.outerHTML === html) };
  });
  expect(evidence.applied).toEqual(Array.from({ length: 5 }, () => ({
    direction: 'rtl', alignment: 'left', sourcePreserved: true, metadataPreserved: true, isolated: ['React']
  })));
  expect(evidence.untouched).toBe(true);
  expect(evidence.displayOverrideDirection).toBe('ltr');
  expect(evidence.inlineDirections).toEqual(['ltr', 'ltr', 'ltr']);
  expect(evidence.restored).toBe(true);
});

test('installed helper styles preserve inherited physical-left paragraph alignment', async ({ page }) => {
  await page.setContent('<main style="text-align:left"><p>سلام React دنیا</p></main>');
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    api.installBidiStyles(document);
    api.applyBidi(document.querySelector('main')!);
  });
  await expect(page.locator('p')).toHaveCSS('direction', 'rtl');
  await expect(page.locator('p')).toHaveCSS('text-align', 'left');
});

test('noscript evidence follows actual rendering rather than guessing the target scripting mode', async ({ page }) => {
  await page.setContent('<main><p id="normal">سلام دنیا <noscript>Many ordinary English words describe a very long visible paragraph.</noscript></p><p id="contents">سلام دنیا <noscript style="display:contents !important">Many ordinary English words describe a very long visible paragraph.</noscript></p></main><iframe sandbox="allow-same-origin"></iframe>');
  await page.addScriptTag({ content: bundle });
  const evidence = await page.evaluate(async () => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    const root = document.querySelector('main')!;
    const expected = [...root.querySelectorAll('p')].map((paragraph) =>
      paragraph.innerText.includes('Many ordinary') ? 'ltr' : 'rtl');
    const source = root.textContent;
    api.applyBidi(root);
    const directions = [...root.querySelectorAll('p')].map((paragraph) => getComputedStyle(paragraph).direction);
    api.restoreBidi(root);
    const frame = document.querySelector('iframe')!;
    await new Promise<void>((resolve) => {
      frame.onload = () => resolve();
      frame.srcdoc = '<main><p>سلام دنیا <noscript>Many ordinary English words describe a very long visible paragraph.</noscript></p></main>';
    });
    const fallbackRoot = frame.contentDocument!.querySelector('main')!;
    const fallback = fallbackRoot.querySelector('p')!;
    const fallbackVisible = fallback.innerText.includes('Many ordinary');
    const fallbackSource = fallbackRoot.textContent;
    api.applyBidi(fallbackRoot);
    const fallbackDirection = frame.contentWindow!.getComputedStyle(fallback).direction;
    api.restoreBidi(fallbackRoot);
    return { expected, directions, sourcePreserved: root.textContent === source,
      fallbackVisible, fallbackDirection, fallbackSourcePreserved: fallbackRoot.textContent === fallbackSource };
  });
  expect(evidence.directions).toEqual(evidence.expected);
  expect(evidence).toMatchObject({ sourcePreserved: true, fallbackVisible: true,
    fallbackDirection: 'ltr', fallbackSourcePreserved: true });
});

test('absent inline metadata cannot split a visibly continuous URL', async ({ page }) => {
  await page.setContent('<main><p dir="rtl">سلام https://example<span hidden><bdi dir="rtl">metadata</bdi><code>code</code></span>.com/path پایان</p></main>');
  await page.addScriptTag({ content: bundle });
  const result = await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    const root = document.querySelector('main')!;
    const absent = root.querySelector('[hidden]')!;
    const source = root.textContent;
    api.applyBidi(root, { strategy: 'rtl' });
    const isolate = root.querySelector('bdi[data-bidilens-isolate]')!;
    const textNodes = Array.from(isolate.childNodes).filter((node): node is Text => node.nodeType === 3);
    const prefix = document.createRange(); prefix.selectNodeContents(textNodes[0]!);
    const suffix = document.createRange(); suffix.selectNodeContents(textNodes.at(-1)!);
    const prefixLeft = prefix.getBoundingClientRect().left;
    const suffixLeft = suffix.getBoundingClientRect().left;
    const count = root.querySelectorAll('bdi[data-bidilens-isolate]').length;
    const repeated = api.applyBidi(root, { strategy: 'rtl' });
    const stable = root.querySelector('bdi[data-bidilens-isolate]') === isolate;
    const retained = isolate.contains(absent);
    api.restoreBidi(root);
    return { prefixLeft, suffixLeft, count, stable, retained, repeated: repeated.isolated,
      sourcePreserved: root.textContent === source, originalAbsentNode: root.querySelector('[hidden]') === absent };
  });
  expect(result.prefixLeft).toBeLessThan(result.suffixLeft);
  expect(result).toMatchObject({ count: 1, stable: true, retained: true, repeated: 0,
    sourcePreserved: true, originalAbsentNode: true });
});

test('rich inline isolation retains fragment order, backward selection, identity, and stable reapplication', async ({ page }) => {
  await page.setContent('<main style="width:1200px"><p style="text-align:left">لینک https://<strong>example</strong>.com را باز کنید.</p></main>');
  await page.addScriptTag({ content: bundle });
  const evidence = await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    const root = document.querySelector('main')!;
    const strong = root.querySelector('strong')!;
    const source = root.textContent;
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(strong.firstChild!, 7, strong.firstChild!, 0);
    api.applyBidi(root);
    const selectedAfterApply = selection.toString();
    const logicalOffset = (node: Node, offset: number): number => {
      const range = document.createRange();
      range.selectNodeContents(root); range.setEnd(node, offset);
      return range.toString().length;
    };
    const backward = logicalOffset(selection.anchorNode!, selection.anchorOffset) > logicalOffset(selection.focusNode!, selection.focusOffset);
    const wrapper = root.querySelector('bdi')!;
    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) if (node.textContent) texts.push(node as Text);
    const range = document.createRange();
    range.setStart(texts[0]!, 0); range.setEnd(texts[0]!, 1);
    const first = range.getBoundingClientRect().left;
    const lastText = texts.at(-1)!;
    range.setStart(lastText, lastText.length - 1); range.setEnd(lastText, lastText.length);
    const last = range.getBoundingClientRect().left;
    const repeated = api.applyBidi(root);
    const stable = root.querySelector('bdi') === wrapper;
    api.restoreBidi(root);
    return { first, last, selectedAfterApply, selectedAfterRestore: selection.toString(), backward,
      stable, repeated: repeated.isolated, identity: root.querySelector('strong') === strong,
      sourcePreserved: root.textContent === source };
  });
  expect(evidence.first).toBeLessThan(evidence.last);
  expect(evidence).toMatchObject({ selectedAfterApply: 'example', selectedAfterRestore: 'example', backward: true,
    stable: true, repeated: 0, identity: true, sourcePreserved: true });
});

test('an omitted partial-format range cannot cause a generated-wrapper observer loop', async ({ page }) => {
  await page.setContent('<main><p>سلام <strong>سلام https://</strong>example.com و React دنیا.</p></main>');
  await page.addScriptTag({ content: bundle });
  const evidence = await page.evaluate(async () => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    const root = document.querySelector<HTMLElement>('main')!;
    const observed = api.observeBidi(root, { debounceMs: 0 });
    const wrapper = root.querySelector('bdi');
    let mutations = 0;
    const probe = new MutationObserver((records) => mutations += records.length);
    probe.observe(root, { childList: true, subtree: true, characterData: true });
    observed.flush();
    await new Promise((resolve) => setTimeout(resolve, 50));
    observed.disconnect(); probe.disconnect();
    return { stable: root.querySelector('bdi') === wrapper, mutations };
  });
  expect(evidence).toEqual({ stable: true, mutations: 0 });
});

test('restoration preserves excluded editor selection and unowned marker-like HTML', async ({ page }) => {
  await page.setContent('<main><p id="message" style="text-align:left">سلام page 97</p><div id="editor" contenteditable="true"></div><aside><bdi data-bidilens-dom-generated dir="ltr">author content</bdi></aside></main>');
  await page.addScriptTag({ content: bundle });
  const evidence = await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    const root = document.querySelector('main')!;
    const message = root.querySelector<HTMLElement>('#message')!;
    const editor = root.querySelector<HTMLElement>('#editor')!;
    const authored = root.querySelector('aside bdi')!;
    const nodes = ['Hello ', 'world', ''].map((text) => document.createTextNode(text));
    editor.append(...nodes);
    editor.focus();
    const selection = window.getSelection()!;
    selection.setBaseAndExtent(nodes[1]!, 0, nodes[1]!, 5);
    const observer = new MutationObserver(() => {});
    observer.observe(editor, { subtree: true, childList: true, characterData: true });
    const annotated = api.applyBidi(root, { skipSelector: '[contenteditable]' }).annotated;
    const correctedDirection = getComputedStyle(message).direction;
    const correctedAlignment = getComputedStyle(message).textAlign;
    const restored = api.restoreBidi(root);
    const repeatedRestore = api.restoreBidi(root);
    const mutations = observer.takeRecords().length;
    observer.disconnect();
    return {
      annotated, correctedDirection, correctedAlignment, restored, repeatedRestore, mutations,
      nodesUnchanged: editor.childNodes.length === nodes.length
        && nodes.every((node, index) => editor.childNodes[index] === node),
      values: nodes.map((node) => node.data),
      selectionUnchanged: selection.anchorNode === nodes[1] && selection.focusNode === nodes[1]
        && selection.anchorOffset === 0 && selection.focusOffset === 5,
      selected: selection.toString(),
      focusUnchanged: document.activeElement === editor,
      authoredUnchanged: root.querySelector('aside bdi') === authored && authored.textContent === 'author content',
      messageRestored: message.textContent === 'سلام page 97' && !message.hasAttribute('dir')
        && message.querySelector('bdi') === null && message.style.textAlign === 'left'
    };
  });
  expect(evidence).toEqual({
    annotated: 1, correctedDirection: 'rtl', correctedAlignment: 'left',
    restored: 1, repeatedRestore: 0, mutations: 0,
    nodesUnchanged: true, values: ['Hello ', 'world', ''],
    selectionUnchanged: true, selected: 'world', focusUnchanged: true,
    authoredUnchanged: true, messageRestored: true
  });
});

test('currency and ranges preserve internal order in left-aligned RTL prose', async ({ page }) => {
  await page.setContent('<main dir="ltr"><p style="text-align:left">هزینه $10 و صفحات 10-20 است.</p></main>');
  await page.addScriptTag({ content: bundle });
  const evidence = await page.evaluate(() => {
    (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom.applyBidi(document.body);
    const paragraph = document.querySelector('p')!;
    return {
      source: paragraph.textContent,
      tokens: [...paragraph.querySelectorAll('bdi')].map((element) => {
        const node = element.firstChild!;
        const range = document.createRange();
        range.setStart(node, 0); range.setEnd(node, 1);
        const first = range.getBoundingClientRect().left;
        const lastIndex = (node.textContent?.length ?? 1) - 1;
        range.setStart(node, lastIndex); range.setEnd(node, lastIndex + 1);
        return { text: element.textContent, first, last: range.getBoundingClientRect().left };
      })
    };
  });
  expect(evidence.source).toBe('هزینه $10 و صفحات 10-20 است.');
  expect(evidence.tokens.map((token) => token.text)).toEqual(['$10', '10-20']);
  for (const token of evidence.tokens) expect(token.first).toBeLessThan(token.last);
  await expect(page.locator('p')).toHaveCSS('direction', 'rtl');
  await expect(page.locator('p')).toHaveCSS('text-align', 'left');
});

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
    const lastText = isolate.lastChild!;
    const range = document.createRange();
    range.setStart(text, 0); range.setEnd(text, 4);
    const pageLeft = range.getBoundingClientRect().left;
    const lastLength = lastText.textContent!.length;
    range.setStart(lastText, lastLength - 2); range.setEnd(lastText, lastLength);
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

test('grouped numbers and percentages retain visual order, logical copy, and left alignment', async ({ page }) => {
  const source = 'مقدار 1,000,000 و ۱٬۰۰۰٬۰۰۰ و 50% و ۵۰٪ است.';
  await page.setContent('<main dir="ltr"><p style="width:900px;text-align:left"></p></main>');
  await page.locator('p').evaluate((paragraph, text) => { paragraph.textContent = text; }, source);
  await page.addScriptTag({ content: bundle });
  const evidence = await page.evaluate(() => {
    const api = (window as unknown as { BidiLensDom: typeof DomAdapter }).BidiLensDom;
    const paragraph = document.querySelector('p')!;
    api.applyBidi(document.body);
    const tokens = [...paragraph.querySelectorAll('bdi')].map((element) => {
      const node = element.firstChild!;
      const range = document.createRange();
      range.setStart(node, 0); range.setEnd(node, 1);
      const first = range.getBoundingClientRect().left;
      const end = node.textContent!.length;
      range.setStart(node, end - 1); range.setEnd(node, end);
      return { text: element.textContent, first, last: range.getBoundingClientRect().left };
    });
    const selection = window.getSelection()!;
    selection.selectAllChildren(paragraph);
    const copied = selection.toString();
    api.restoreBidi(document.body);
    return { tokens, copied, restored: paragraph.textContent, alignment: paragraph.style.textAlign };
  });
  expect(evidence.tokens.map((token) => token.text)).toEqual(['1,000,000', '۱٬۰۰۰٬۰۰۰', '50%', '۵۰٪']);
  for (const token of evidence.tokens) expect(token.first).toBeLessThan(token.last);
  expect(evidence).toMatchObject({ copied: source, restored: source, alignment: 'left' });
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
