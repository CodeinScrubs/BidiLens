// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyBidi, installBidiStyles } from './index.js';

describe('DOM adapter', () => {
  it('assigns RTL to Persian-majority prose that starts with React', () => {
    document.body.innerHTML = '<p id="flagship">React یک کتابخانه جاوااسکریپت بسیار محبوب است.</p>';
    const paragraph = document.querySelector<HTMLElement>('#flagship')!;
    applyBidi(paragraph.parentElement!);
    expect(paragraph.dir).toBe('rtl');
    expect(paragraph.getAttribute('dir')).toBe('rtl');
    expect(paragraph.hasAttribute('data-bidilens-block')).toBe(true);
    expect(paragraph.style.unicodeBidi).toBe('');
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
});
