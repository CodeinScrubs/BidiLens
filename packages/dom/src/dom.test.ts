// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyBidi, installBidiStyles, observeBidi, restoreBidi } from './index.js';

describe('DOM adapter', () => {
  it('assigns RTL to Persian-majority prose that starts with React', () => {
    document.body.innerHTML = '<p id="flagship">React یک کتابخانه جاوااسکریپت بسیار محبوب است.</p>';
    const paragraph = document.querySelector<HTMLElement>('#flagship')!;
    applyBidi(paragraph.parentElement!);
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.getAttribute('dir')).toBe('rtl');
    expect(paragraph.hasAttribute('data-bidilens-block')).toBe(true);
    expect(paragraph.style.unicodeBidi).toBe('');
    expect(paragraph.querySelector('bdi')?.textContent).toBe('React');
    expect(paragraph.querySelector('bdi')?.dir).toBe('ltr');
  });

  it('annotates prose and isolates code', () => {
    document.body.innerHTML = `
      <article id="message">
        <p>فایل <code>src/index.ts</code> را باز کن.</p>
        <p>Hello world</p>
      </article>
    `;
    const root = document.querySelector<HTMLElement>('#message')!;
    const result = applyBidi(root);
    const paragraphs = root.querySelectorAll('p');
    const code = root.querySelector('code')!;

    expect(result.annotated).toBe(2);
    expect(paragraphs[0]?.getAttribute('dir')).toBe('rtl');
    expect(paragraphs[1]?.getAttribute('dir')).toBe('ltr');
    expect(code.getAttribute('dir')).toBe('ltr');
    expect(code.hasAttribute('data-bidilens-code')).toBe(true);
    expect(result.scanned).toBe(2);
    expect(result.rtl).toBe(1);
    expect(result.ltr).toBe(1);
    expect(code.style.unicodeBidi).toBe('isolate');
  });

  it('installs styles only once', () => {
    document.head.innerHTML = '';
    const first = installBidiStyles(document);
    const second = installBidiStyles(document);
    expect(first).toBe(second);
    expect(document.querySelectorAll('style[data-bidilens-styles]')).toHaveLength(1);
    expect(first.textContent).not.toContain('unicode-bidi: plaintext');
    expect(first.textContent).toContain('unicode-bidi: isolate');
    expect(first.textContent).toContain('[data-bidilens-code]');
  });

  it('supports skipped blocks, neutral fallback, and annotation callbacks', () => {
    document.body.innerHTML = '<section id="root"><p id="skip">سلام</p><p id="neutral">---</p></section>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const seen: string[] = [];
    const result = applyBidi(root, {
      fallback: 'neutral',
      skipSelector: '#skip',
      onAnnotated: (element, direction) => seen.push(`${element.id}:${direction}`)
    });
    const skipped = document.querySelector<HTMLElement>('#skip')!;
    const neutral = document.querySelector<HTMLElement>('#neutral')!;
    expect(result.scanned).toBe(1);
    expect(result.annotated).toBe(1);
    expect(result.neutral).toBe(1);
    expect(seen).toEqual(['neutral:neutral']);
    expect(skipped.hasAttribute('data-bidilens-block')).toBe(false);
    expect(neutral.hasAttribute('dir')).toBe(false);
  });

  it('supports custom selectors and explicit includeRoot', () => {
    document.body.innerHTML = '<div id="root">Hello <span class="candidate">سلام</span></div>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const result = applyBidi(root, {
      blockSelector: '#root,.candidate',
      includeRoot: true,
      markAttribute: 'data-custom-bidi'
    });
    const candidate = root.querySelector<HTMLElement>('.candidate')!;
    expect(result.scanned).toBe(2);
    expect(result.annotated).toBe(2);
    expect(root.getAttribute('data-custom-bidi')).toBe('');
    expect(candidate.getAttribute('data-custom-bidi')).toBe('');
    expect(root.dir).toBe('ltr');
    expect(candidate.dir).toBe('rtl');
  });

  it('uses the caller code selector when excluding technical content from direction evidence', () => {
    document.body.innerHTML = '<p id="message">سلام دنیا <span class="machine">ThisIsAVeryLongTechnicalIdentifier</span></p>';
    const paragraph = document.querySelector<HTMLElement>('#message')!;
    applyBidi(document.body, { codeSelector: '.machine' });
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.querySelector<HTMLElement>('.machine')?.dir).toBe('ltr');
    expect(paragraph.querySelector<HTMLElement>('.machine')?.dataset.bidilensCode).toBe('');
  });

  it('isolates opposite natural-language runs without changing logical text and is idempotent', () => {
    const source = 'The Persian word کتاب means book.';
    document.body.innerHTML = `<p id="message">${source}</p>`;
    const first = applyBidi(document.body);
    const paragraph = document.querySelector<HTMLElement>('#message')!;
    expect(paragraph.dir).toBe('ltr');
    expect(paragraph.querySelector('bdi[dir="rtl"]')?.textContent).toBe('کتاب');
    expect(paragraph.textContent).toBe(source);
    expect(first.isolated).toBeGreaterThan(0);
    applyBidi(document.body);
    expect(paragraph.querySelectorAll('bdi')).toHaveLength(1);
    expect(paragraph.textContent).toBe(source);
  });

  it('restores original attributes, inline style, and logical text exactly', () => {
    const source = 'React یک کتابخانه جاوااسکریپت بسیار محبوب است.';
    document.body.innerHTML = `<p id="message" dir="ltr" data-custom="original" style="unicode-bidi:isolate">${source}</p>`;
    const paragraph = document.querySelector<HTMLElement>('#message')!;
    const originalMarkup = paragraph.outerHTML;
    applyBidi(document.body, { markAttribute: 'data-custom-marker' });
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.querySelector('[data-bidilens-dom-generated]')?.textContent).toBe('React');
    expect(paragraph.getAttribute('data-custom-marker')).toBe('');
    expect(restoreBidi(document.body)).toBe(1);
    expect(paragraph.textContent).toBe(source);
    expect(paragraph.dir).toBe('ltr');
    expect(paragraph.style.unicodeBidi).toBe('isolate');
    expect(paragraph.hasAttribute('data-custom-marker')).toBe(false);
    expect(paragraph.getAttribute('data-custom')).toBe('original');
    expect(paragraph.outerHTML).toBe(originalMarkup);
    expect(restoreBidi(document.body)).toBe(0);
  });

  it('observes streamed mutations, supports flush, and stops after disconnect', async () => {
    document.body.innerHTML = '<section id="root"></section>';
    const root = document.querySelector<HTMLElement>('#root')!;
    const controller = observeBidi(root, { debounceMs: 0 });
    root.insertAdjacentHTML('beforeend', '<p id="first">سلام دنیا</p>');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.querySelector<HTMLElement>('#first')?.dir).toBe('rtl');

    root.insertAdjacentHTML('beforeend', '<p id="second">Hello world</p>');
    const flushed = controller.flush();
    expect(flushed.annotated).toBe(2);
    expect(document.querySelector<HTMLElement>('#second')?.dir).toBe('ltr');

    controller.disconnect();
    root.insertAdjacentHTML('beforeend', '<p id="third">مرحبا بالعالم</p>');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.querySelector<HTMLElement>('#third')?.hasAttribute('data-bidilens-block')).toBe(false);
  });

  it('supports elements from a detached document without relying on global constructors', () => {
    const detached = document.implementation.createHTMLDocument('detached');
    detached.body.innerHTML = '<p id="message">React یک کتابخانه محبوب است.</p>';
    const paragraph = detached.querySelector<HTMLElement>('#message')!;
    const result = applyBidi(detached.body);
    expect(result.annotated).toBe(1);
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.textContent).toBe('React یک کتابخانه محبوب است.');
    expect(paragraph.querySelector('bdi')?.textContent).toBe('React');
  });
});
